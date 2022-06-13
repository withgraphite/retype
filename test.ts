import { expect } from "chai";
import * as t from "./index";

// wrap with arrays to prevent conditional spreading
type TypeExtends<A, B> = [A] extends [B] ? true : never;
type TypeEquals<A, B> = TypeExtends<A, B> & TypeExtends<B, A>;

// TYPESYSTEM TESTS (see below for runtime tests)
const testUndefined: TypeEquals<
  t.TypeOf<typeof t.undefinedtype>,
  undefined
> = true as const;

const testNull: TypeEquals<t.TypeOf<typeof t.nulltype>, null> = true as const;

const literalBooleanSchema = t.literal(true as const);
const testLiteralBoolean: TypeEquals<
  t.TypeOf<typeof literalBooleanSchema>,
  true
> = true as const;

const literalNumberSchema = t.literal(42 as const);
const testLiteralNumber: TypeEquals<
  t.TypeOf<typeof literalNumberSchema>,
  42
> = true as const;

const literalStringSchema = t.literal("string" as const);
const testLiteralString: TypeEquals<
  t.TypeOf<typeof literalStringSchema>,
  "string"
> = true as const;

const testBoolean: TypeEquals<
  t.TypeOf<typeof t.boolean>,
  boolean
> = true as const;

const testNumber: TypeEquals<t.TypeOf<typeof t.number>, number> = true as const;

const testString: TypeEquals<t.TypeOf<typeof t.string>, string> = true as const;

const optionalSchema = t.optional(t.string);
const testOptional: TypeEquals<
  t.TypeOf<typeof optionalSchema>,
  string | undefined
> = true as const;

const nullableSchema = t.nullable(t.string);
const testNullable: TypeEquals<
  t.TypeOf<typeof nullableSchema>,
  string | null
> = true as const;

const shapeSchema = t.shape({
  strKey: t.string,
  optNumKey: t.optional(t.number),
});
const testShape: TypeEquals<
  t.TypeOf<typeof shapeSchema>,
  { strKey: string; optNumKey?: number }
> = true as const;

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
const testTaggedUnion: TypeEquals<
  t.TypeOf<typeof taggedUnionSchema>,
  | { tag: "t1"; strKey: string; numKey?: number }
  | { tag: "t2"; booleanKey: boolean; numKey: number }
> = true as const;

const arraySchema = t.array(t.string);
const testArray: TypeEquals<
  t.TypeOf<typeof arraySchema>,
  string[]
> = true as const;

const tupleSchema = t.tuple([t.string, t.number] as const);
const testTuple: TypeEquals<
  t.TypeOf<typeof tupleSchema>,
  readonly [string, number]
> = true as const;

const unionSchema = t.union(t.string, t.number);
const testUnion: TypeEquals<
  t.TypeOf<typeof unionSchema>,
  string | number
> = true as const;

const intersectionSchema = t.intersection(
  t.optional(t.string),
  t.nullable(t.string)
);
const testIntersection: TypeEquals<
  t.TypeOf<typeof intersectionSchema>,
  string
> = true as const;

const unionManySchema = t.unionMany([t.string, t.number, t.boolean]);
const testUnionMany: TypeEquals<
  t.TypeOf<typeof unionManySchema>,
  string | number | boolean
> = true as const;

const intersectManySchema = t.intersectMany([
  t.optional(t.string),
  t.nullable(t.string),
  t.union(t.string, t.number),
]);
const testIntersectMany: TypeEquals<
  t.TypeOf<typeof intersectManySchema>,
  string
> = true as const;

const literalsSchema = t.literals(["literal" as const, 42 as const]);
const testLiterals: TypeEquals<
  t.TypeOf<typeof literalsSchema>,
  "literal" | 42
> = true as const;

void testUndefined,
  testNull,
  testLiteralBoolean,
  testLiteralNumber,
  testLiteralString,
  testBoolean,
  testNumber,
  testString,
  testOptional,
  testNullable,
  testShape,
  testTaggedUnion,
  testArray,
  testTuple,
  testUnion,
  testIntersection,
  testUnionMany,
  testIntersectMany,
  testLiterals;

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
