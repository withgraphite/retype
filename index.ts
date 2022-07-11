/**
 * This library reifies typescript types so that we can validate them at runtime.
 *
 * The idea was heavily inspired by https://gcanti.github.io/io-ts/
 */

type TOpts = { logFailures: boolean };

export type Schema<TInner> = (value: unknown, opts?: TOpts) => value is TInner;

type ExtractTypeguard<T> = T extends (v: unknown, o?: TOpts) => v is infer U
  ? U
  : never;
export type TypeOf<A extends Schema<unknown>> = ExtractTypeguard<A>;

export type UnwrapSchemaMap<TSchemaMap> = keyof TSchemaMap extends never
  ? Record<string | number | symbol, undefined>
  : FixOptionalIndices<{
      [SchemaMapIndex in keyof TSchemaMap]: TSchemaMap[SchemaMapIndex] extends Schema<unknown>
        ? TypeOf<TSchemaMap[SchemaMapIndex]>
        : never;
    }>;

export const undefinedtype = (value: unknown): value is undefined => {
  return typeof value === "undefined";
};

// Have to clothe the type so that boolean isn't distrubuted
// I.e. type Extends<A, B> = A extends B ? true : false;
// results in:
// Extends<boolean, true> = Extends<true, true> | Extends<false, true> = true | false
type Extends<A, B> = [A] extends [B] ? true : false;
type NonGenericExceptBooleans<A> = true extends
  | Extends<string, A>
  | Extends<number, A>
  ? never
  : A;
type NonGeneric<A> = true extends Extends<boolean, A>
  ? never
  : NonGenericExceptBooleans<A>;

function literalWithoutGenericCheck<TInner>(inner: TInner) {
  return (value: unknown): value is TInner => {
    // Not entirely correct, b/c you could have a literal dict, but should work for strings, numbers (might be weird around floats), and booleans
    return JSON.stringify(inner) === JSON.stringify(value);
  };
}

export function literal<TInner>(
  inner: NonGeneric<TInner>
): (value: unknown) => value is NonGeneric<TInner> {
  return literalWithoutGenericCheck(inner);
}

// JSON Types

export const number = (value: unknown): value is number => {
  return typeof value === "number";
};

export const string = (value: unknown): value is string => {
  return typeof value === "string";
};

export const boolean = (value: unknown): value is boolean => {
  return typeof value === "boolean";
};

export const nulltype = (value: unknown): value is null => {
  return value === null;
};

/**
 * Note: I'm explicitly excluding dictionaries from this library.
 * I have seen very few legitimate uses of dictionaries in API design
 * and more common than not, the use case is better served by a shape
 * or an array.
 */

/**
 * If we define the below schema and extracted type:
 *
 *     const mySchema = shape({requiredKey: string, optionalKey: optional(string)})
 *     type TMySchema = TypeOf<typeof mySchema>
 *
 * We want the following to work:
 *
 *     const myObject: TMySchema = {requiredKey: 'value'}
 *
 * This doesn't work out of the box with our definition of optional.
 * FixOptionalIndices defined below gives us this.
 */
type OptionalIndices<T> = {
  [Index in keyof T]: undefined extends T[Index] ? Index : never;
}[keyof T];

type RequiredIndices<T> = {
  [Index in keyof T]: undefined extends T[Index] ? never : Index;
}[keyof T];

type FixOptionalIndices<T> = {
  [OIndex in OptionalIndices<T>]?: T[OIndex];
} & {
  [RIndex in RequiredIndices<T>]: T[RIndex];
};

export function shape<
  TDefnSchema extends {
    [key: string]: Schema<unknown>;
  },
  TDefn extends FixOptionalIndices<{
    [DefnIndex in keyof TDefnSchema]: TypeOf<TDefnSchema[DefnIndex]>;
  }>
>(schema: TDefnSchema) {
  return (value: unknown, opts?: TOpts): value is TDefn => {
    // This explicitly allows additional keys so that the validated object
    // can be intersected with other shape types (i.e. value is a superset of schema)

    return (
      typeof value === "object" &&
      value !== null && // one of my fave JS-isms: typeof null === "object"
      Object.keys(schema).every((key: string) => {
        const childMatches =
          schema[key] &&
          schema[key]((value as Record<string, unknown>)[key], opts);
        if (!childMatches && opts?.logFailures) {
          console.log(
            `Member of shape ${JSON.stringify(
              (value as Record<string, unknown>)[key]
            )} for ${key} does not match expected type`
          );
        }
        return childMatches;
      })
    );
  };
}

type TDefnSchemasForTags<TTag extends string> = {
  [TagValueLiteral in string]: {
    [key: string]: Schema<unknown>;
  } & { [tag in TTag]: Schema<TagValueLiteral> };
};

type TaggedUnionDefn<
  TTag extends string,
  TDefnSchemas extends TDefnSchemasForTags<TTag>
> = {
  [TagValueLiteral in keyof TDefnSchemas]: FixOptionalIndices<{
    [ShapeItemKey in keyof TDefnSchemas[TagValueLiteral]]: TypeOf<
      TDefnSchemas[TagValueLiteral][ShapeItemKey]
    >;
  }>;
}[keyof TDefnSchemas];

export function taggedUnion<
  TTag extends string,
  TDefnSchemas extends TDefnSchemasForTags<TTag>,
  TDefn extends TaggedUnionDefn<TTag, TDefnSchemas>
>(tag: TTag, schemas: TDefnSchemas) {
  return (value: unknown, opts?: TOpts): value is TDefn => {
    if (typeof value !== "object" || value === null || !(tag in value)) {
      if (opts?.logFailures) {
        console.log(`Tagged union is not an object or missing tag`);
      }
      return false;
    }

    const schema = schemas[(value as Record<string, string>)[tag]];

    if (!schema) {
      return false;
    }

    return Object.keys(schema).every((key) => {
      const childMatches =
        schema[key] &&
        schema[key]((value as Record<string, unknown>)[key], opts);
      if (!childMatches && opts?.logFailures) {
        console.log(
          `Member of shape ${JSON.stringify(
            (value as Record<string, unknown>)[key]
          )} for ${key} does not match expected type`
        );
      }
      return childMatches;
    });
  };
}

export function array<TMember>(member: Schema<TMember>) {
  return (value: unknown, opts?: TOpts): value is TMember[] => {
    return (
      Array.isArray(value) &&
      value.every((v) => {
        const childMatches = member(v, opts);
        if (!childMatches && opts?.logFailures) {
          console.log(
            `Member of array "${JSON.stringify(
              v
            )}" does not match expected type`
          );
        }
        return childMatches;
      })
    );
  };
}

// Not technically called out in JSON, but we can use JSON for this
/**
 * Note: when defining a tuple you should specify the schema array `const`
 *
 *     const tupleSchema = t.tuple([t.string, t.number] as const);
 *
 * If you don't, validation will work, but `t.typeOf` will be too permissive.
 *
 * This is due to a limitation of our current (simple) implementation.
 * We can eventually get to a world where this isn't required.
 */
export function tuple<
  TDefnSchema extends readonly Schema<unknown>[],
  // Mapped tuple logic derived from https://stackoverflow.com/a/51679156/781199
  TDefn extends {
    [DefnIndex in keyof TDefnSchema]: TDefnSchema[DefnIndex] extends Schema<unknown>
      ? TypeOf<TDefnSchema[DefnIndex]>
      : never;
  } & { length: TDefnSchema["length"] }
>(schema: TDefnSchema) {
  return (value: unknown, opts?: TOpts): value is TDefn => {
    return (
      Array.isArray(value) &&
      value.length === schema.length &&
      value.every((v, idx) => {
        const childMatches = schema[idx](v, opts);
        if (!childMatches && opts?.logFailures) {
          console.log(
            `Member of tuple "${JSON.stringify(
              v
            )}" does not match expected type`
          );
        }
        return childMatches;
      })
    );
  };
}

// Typescript Nonsense

export function union<TLeft, TRight>(
  left: Schema<TLeft>,
  right: Schema<TRight>
) {
  return (value: unknown, opts?: TOpts): value is TLeft | TRight => {
    const matches = left(value, opts) || right(value, opts);
    if (!matches && opts?.logFailures) {
      console.log(
        `Member of union "${JSON.stringify(
          value
        )}" does not match expected type`
      );
    }
    return matches;
  };
}

export function intersection<TLeft, TRight>(
  left: Schema<TLeft>,
  right: Schema<TRight>
) {
  return (value: unknown, opts?: TOpts): value is TLeft & TRight => {
    const matches = left(value, opts) && right(value, opts);
    if (!matches && opts?.logFailures) {
      console.log(
        `Member of intersection "${JSON.stringify(
          value
        )}" does not match expected type`
      );
    }
    return matches;
  };
}

export function unionMany<
  TSchema extends Schema<unknown>,
  TInnerSchemaType extends TypeOf<TSchema>
>(inner: TSchema[]) {
  return (value: unknown, opts?: TOpts): value is TInnerSchemaType => {
    const matches = inner.some((schema) => {
      return schema(value, opts);
    });
    if (!matches && opts?.logFailures) {
      console.log(
        `Member of union-many ${JSON.stringify(value)} does not expected type`
      );
    }
    return matches;
  };
}

// Check out https://stackoverflow.com/a/50375286/781199 for how we're
// leveraging distributive conditionals and inference from conditionals
type TPluralIntersectionType<T> = (
  T extends Schema<infer U> ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export function intersectMany<
  TSchema extends Schema<unknown>,
  TInnerSchemaType extends TPluralIntersectionType<TSchema>
>(inner: TSchema[]) {
  return (value: unknown, opts?: TOpts): value is TInnerSchemaType => {
    const matches = inner.every((schema) => {
      return schema(value, opts);
    });
    if (!matches && opts?.logFailures) {
      console.log(
        `Member of intersection-many ${JSON.stringify(
          value
        )} does not expected type`
      );
    }
    return matches;
  };
}

// Helpers

export function literals<TLiterals>(
  // See below for why we exclude booleans here
  inners: readonly NonGenericExceptBooleans<TLiterals>[]
): (
  value: unknown,
  opts?: TOpts | undefined
) => value is NonGenericExceptBooleans<TLiterals> {
  return unionMany(
    inners.map((value) => {
      // Note: we intentionally don't use literal(). The reason is that would
      // break literals([true, false] as const)
      //
      // This is because when we call literal() we need to know what type it's being
      // called with (b/c there is only one lambda in the map), and so logically that
      // type is inferred as the union of all members of the array. When we pass this function
      // an array that contains both true and false, the type of literal is infered as
      // literal<true|false>(value: NonGeneric<true|false>), our mistake catching code in
      // NonGeneric detects that boolean extends true|false and flags it (assuming you simply
      // called literal() without as const, e.g. literal(false) errors b/c it gets infered to
      // literal<boolean>(false))
      return literalWithoutGenericCheck(value);
    })
  );
}

export function optional<TInner>(
  inner: Schema<TInner>
): (value: unknown, opts?: TOpts | undefined) => value is TInner | undefined {
  return union(inner, undefinedtype);
}

export function nullable<TInner>(
  inner: Schema<TInner>
): (value: unknown, opts?: TOpts | undefined) => value is TInner | null {
  return union(inner, nulltype);
}
