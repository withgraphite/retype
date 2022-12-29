import { expect } from "chai";
import * as t from "./index";

// wrap with arrays to prevent conditional spreading
type TypeExtends<A, B> = [A] extends [B] ? true : never;
type TypeEquals<A, B> = TypeExtends<A, B> & TypeExtends<B, A>;

// TYPESYSTEM TESTS (see below for runtime tests)
true as const satisfies TypeEquals<t.TypeOf<typeof t.undefinedtype>, undefined>;

true as const satisfies TypeEquals<t.TypeOf<typeof t.nulltype>, null>;

const literalBooleanSchema = t.literal(true as const);
true as const satisfies TypeEquals<t.TypeOf<typeof literalBooleanSchema>, true>;

const literalNumberSchema = t.literal(42 as const);
true as const satisfies TypeEquals<t.TypeOf<typeof literalNumberSchema>, 42>;

const literalStringSchema = t.literal("string" as const);
true as const satisfies TypeEquals<
  t.TypeOf<typeof literalStringSchema>,
  "string"
>;

true as const satisfies TypeEquals<t.TypeOf<typeof t.boolean>, boolean>;

true as const satisfies TypeEquals<t.TypeOf<typeof t.number>, number>;

true as const satisfies TypeEquals<t.TypeOf<typeof t.string>, string>;

const optionalSchema = t.optional(t.string);
true as const satisfies TypeEquals<
  t.TypeOf<typeof optionalSchema>,
  string | undefined
>;

const nullableSchema = t.nullable(t.string);
true as const satisfies TypeEquals<
  t.TypeOf<typeof nullableSchema>,
  string | null
>;

const shapeSchema = t.shape({
  strKey: t.string,
  optNumKey: t.optional(t.number),
});
true as const satisfies TypeEquals<
  t.TypeOf<typeof shapeSchema>,
  { strKey: string; optNumKey?: number }
>;

const shapeWithExplicitOptionalsSchema = t._shapeWithExplicitOptionals({
  strKey: t.string,
  optNumKey: t.optional(t.number),
});
true as const satisfies TypeEquals<
  t.TypeOf<typeof shapeWithExplicitOptionalsSchema>,
  { strKey: string; optNumKey: number | undefined }
>;

const taggedUnionSchema = t.taggedUnion("tag" as const, {
  t1: {
    tag: t.literal("t1"),
    strKey: t.string,
    numKey: t.optional(t.number),
  },
  t2: {
    tag: t.literal("t2"),
    booleanKey: t.boolean,
    numKey: t.number,
  },
});
true as const satisfies TypeEquals<
  t.TypeOf<typeof taggedUnionSchema>,
  | { tag: "t1"; strKey: string; numKey?: number }
  | { tag: "t2"; booleanKey: boolean; numKey: number }
>;

const arraySchema = t.array(t.string);
true as const satisfies TypeEquals<t.TypeOf<typeof arraySchema>, string[]>;

const tupleSchema = t.tuple([t.string, t.number] as const);
true as const satisfies TypeEquals<
  t.TypeOf<typeof tupleSchema>,
  readonly [string, number]
>;

const unionSchema = t.union(t.string, t.number);
true as const satisfies TypeEquals<
  t.TypeOf<typeof unionSchema>,
  string | number
>;

const intersectionSchema = t.intersection(
  t.optional(t.string),
  t.nullable(t.string)
);
true as const satisfies TypeEquals<t.TypeOf<typeof intersectionSchema>, string>;

const unionManySchema = t.unionMany([t.string, t.number, t.boolean]);
true as const satisfies TypeEquals<
  t.TypeOf<typeof unionManySchema>,
  string | number | boolean
>;

const intersectManySchema = t.intersectMany([
  t.optional(t.string),
  t.nullable(t.string),
  t.union(t.string, t.number),
]);
true as const satisfies TypeEquals<
  t.TypeOf<typeof intersectManySchema>,
  string
>;

const literalsSchema = t.literals(["literal" as const, 42 as const]);
true as const satisfies TypeEquals<
  t.TypeOf<typeof literalsSchema>,
  "literal" | 42
>;

// eslint-disable-next-line max-lines-per-function
describe(`retype runtime tests`, () => {
  it(`validates undefined`, () => {
    const schema = t.undefinedtype;
    expect(schema(undefined)).to.be.true;
    expect(schema("not undefined")).to.be.false;
    expect(schema(null)).to.be.false;
  });

  it(`validates null`, () => {
    const schema = t.nulltype;
    expect(schema(null)).to.be.true;
    expect(schema("not null")).to.be.false;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates literal boolean`, () => {
    const schema = t.literal(true as const);
    expect(schema(true)).to.be.true;
    expect(schema(false)).to.be.false;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates literal number`, () => {
    const schema = t.literal(42 as const);
    expect(schema(42)).to.be.true;
    expect(schema(17)).to.be.false;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates literal string`, () => {
    const schema = t.literal("literal" as const);
    expect(schema("literal")).to.be.true;
    expect(schema("other")).to.be.false;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates boolean`, () => {
    const schema = t.boolean;
    expect(schema(true)).to.be.true;
    expect(schema(false)).to.be.true;
    expect(schema(undefined)).to.be.false;
    expect(schema("string")).to.be.false;
  });

  it(`validates number`, () => {
    const schema = t.number;
    expect(schema(42)).to.be.true;
    expect(schema("string")).to.be.false;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates string`, () => {
    const schema = t.string;
    expect(schema("string")).to.be.true;
    expect(schema(42)).to.be.false;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates optional`, () => {
    const schema = t.optional(t.string);
    expect(schema("string")).to.be.true;
    expect(schema(undefined)).to.be.true;
    expect(schema(null)).to.be.false;
  });

  it(`validates nullable`, () => {
    const schema = t.nullable(t.string);
    expect(schema("string")).to.be.true;
    expect(schema(null)).to.be.true;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates shape`, () => {
    const schema = t.shape({
      strKey: t.string,
      optNumKey: t.optional(t.number),
    });
    expect(schema({ strKey: "string" })).to.be.true;
    expect(schema({ strKey: "string", numKey: undefined })).to.be.true;
    expect(schema({ strKey: "string", numKey: 42 })).to.be.true;
    expect(schema({ numKey: 42 })).to.be.false;
    expect(schema({})).to.be.false;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates shape with explicit optionals`, () => {
    const schema = t._shapeWithExplicitOptionals({
      strKey: t.string,
      optNumKey: t.optional(t.number),
    });
    // even though the generated type requires explicit optionals, this
    // still validates because reading the value gives undefined
    expect(schema({ strKey: "string" })).to.be.true;
    expect(schema({ strKey: "string", numKey: undefined })).to.be.true;
    expect(schema({ strKey: "string", numKey: 42 })).to.be.true;
    expect(schema({ numKey: 42 })).to.be.false;
    expect(schema({})).to.be.false;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates tagged union`, () => {
    const schema = t.taggedUnion("tag" as const, {
      t1: {
        tag: t.literal("t1"),
        strKey: t.string,
        numKey: t.optional(t.number),
      },
      t2: {
        tag: t.literal("t2"),
        booleanKey: t.boolean,
        numKey: t.number,
      },
    });
    expect(schema({ tag: "t1", strKey: "string" })).to.be.true;
    expect(schema({ tag: "t2", strKey: "true", numKey: 42 })).to.be.false;
    expect(schema({ tag: "t2", booleanKey: true, numKey: 42 })).to.be.true;
    expect(schema({ tag: "t2", booleanKey: "true", numKey: 42 })).to.be.false;
    expect(schema({ tag: "t1", numKey: 42 })).to.be.false;
    expect(schema({ strKey: "string" })).to.be.false;
    expect(schema({})).to.be.false;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates array`, () => {
    const schema = t.array(t.string);
    expect(schema(["string"])).to.be.true;
    expect(schema([false])).to.be.false;
    expect(schema(["string", 42])).to.be.false;
    expect(schema(["string", "another"])).to.be.true;
    expect(schema({})).to.be.false;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates tuple`, () => {
    const schema = t.tuple([t.string, t.number] as const);
    expect(schema(["string"])).to.be.false;
    expect(schema([false, 42])).to.be.false;
    expect(schema(["string", 42])).to.be.true;
    expect(schema([42, "string"])).to.be.false;
    expect(schema(["string", "another"])).to.be.false;
    expect(schema([])).to.be.false;
    expect(schema([undefined, 42])).to.be.false;
  });

  it(`validates union`, () => {
    const schema = t.union(t.string, t.number);
    expect(schema("string")).to.be.true;
    expect(schema(42)).to.be.true;
    expect(schema(["string", 42])).to.be.false;
    expect(schema(false)).to.be.false;
  });

  it(`validates intersection`, () => {
    const schema = t.intersection(t.optional(t.number), t.nullable(t.number));
    expect(schema(42)).to.be.true;
    expect(schema(undefined)).to.be.false;
    expect(schema(null)).to.be.false;
  });

  it(`validates unionMany`, () => {
    const schema = t.unionMany([t.string, t.number, t.boolean]);
    expect(schema("string")).to.be.true;
    expect(schema(42)).to.be.true;
    expect(schema(true)).to.be.true;
    expect(schema(undefined)).to.be.false;
  });

  it(`validates intersectionMany`, () => {
    const schema = t.intersectMany([
      t.optional(t.number),
      t.nullable(t.number),
      t.union(t.number, t.boolean),
    ]);
    expect(schema(42)).to.be.true;
    expect(schema(undefined)).to.be.false;
    expect(schema(null)).to.be.false;
    expect(schema(false)).to.be.false;
  });

  it(`validates literals`, () => {
    const schema = t.literals(["literal" as const, 42 as const]);
    expect(schema(42)).to.be.true;
    expect(schema("literal")).to.be.true;
    expect(schema("string")).to.be.false;
    expect(schema(undefined)).to.be.false;
  });
});
