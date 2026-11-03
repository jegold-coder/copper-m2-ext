// The fifth Ask Copper tool, get_features: what each product can do, read from
// the catalog. Needs no AI key and never calls a model.
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadTools() {
  vi.resetModules();
  return import("@/lib/copper/assistant/tools");
}

afterEach(() => {
  vi.doUnmock("@/lib/copper/catalog");
  vi.resetModules();
});

describe("get_features", () => {
  it("returns the features of every product when no product is named", async () => {
    const { listFeatures } = await loadTools();
    const { products } = listFeatures({});
    expect(products.map((p) => p.id)).toEqual(["copper-home", "copper-notes"]);
    const names = products.flatMap((p) => p.features.map((f) => f.name));
    expect(names).toEqual(
      expect.arrayContaining(["Monsoon Mode", "Meeting Mode", "Consent Chime"]),
    );
    for (const feature of products.flatMap((p) => p.features)) {
      expect(feature.description.length).toBeGreaterThan(0);
    }
  });

  it("returns only one product's features when asked for it", async () => {
    const { listFeatures } = await loadTools();
    const notes = listFeatures({ product: "copper-notes" }).products;
    expect(notes).toHaveLength(1);
    expect(notes[0].name).toBe("Copper Notes");
    const names = notes[0].features.map((f) => f.name);
    expect(names).toContain("Lecture Mode");
    expect(names).not.toContain("Monsoon Mode");
  });

  it("follows the catalog when a feature changes", async () => {
    vi.doMock("@/lib/copper/catalog", async (importOriginal) => {
      const real =
        await importOriginal<typeof import("@/lib/copper/catalog")>();
      return {
        ...real,
        getProducts: () =>
          real.getProducts().map((p) => ({
            ...p,
            features: [
              { name: "Test Mode", description: "A made-up feature." },
            ],
          })),
      };
    });
    const { listFeatures } = await loadTools();
    const { products } = listFeatures({ product: "copper-home" });
    expect(products[0].features).toEqual([
      { name: "Test Mode", description: "A made-up feature." },
    ]);
  });

  it("only accepts a Copper product, or no product at all", async () => {
    const { listFeaturesInput } = await loadTools();
    expect(listFeaturesInput.safeParse({}).success).toBe(true);
    expect(
      listFeaturesInput.safeParse({ product: "copper-home" }).success,
    ).toBe(true);
    expect(
      listFeaturesInput.safeParse({ product: "copper-watch" }).success,
    ).toBe(false);
  });

  it("is one of Copper's tools, with a description, and runs", async () => {
    const { copperTools } = await loadTools();
    const tool = copperTools.get_features;
    expect(tool).toBeDefined();
    expect(tool.description).toMatch(/\w{4,}/);
    expect(typeof tool.execute).toBe("function");
    // Run it the way the model would: an input, plus the call's bookkeeping.
    const run = tool.execute as (
      input: unknown,
      options: unknown,
    ) => Promise<unknown>;
    const result = (await run(
      { product: "copper-home" },
      { toolCallId: "t1", messages: [] },
    )) as { products: { name: string }[] };
    expect(result.products[0].name).toBe("Copper Home");
  });
});
