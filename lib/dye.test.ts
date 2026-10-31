import { describe, expect, it } from "vitest";
import { buildTaskBody, dyeHex, isFeature } from "./youcam";
import { demoBrowOnWig, renderDemo, type DemoManifest } from "./render";

describe("hair colour (Hair Color API)", () => {
  it("darkens the ring hex to the calibrated dye hex", () => {
    expect(dyeHex("#5C3420")).toBe("#2A180F");
    expect(dyeHex("#000000")).toBe("#000000");
  });

  it("sends full mode with one palette, never a preset", () => {
    const body = buildTaskBody("color", { url: "https://yce-us.s3-accelerate.amazonaws.com/x.jpg" }, { hex: "#5C3420" }) as Record<string, unknown>;
    expect(body).toEqual({
      src_file_url: "https://yce-us.s3-accelerate.amazonaws.com/x.jpg",
      pattern: { name: "full" },
      palettes: [{ color: "#2A180F", color_intensity: 100, shine_intensity: 0 }],
    });
    expect(body).not.toHaveProperty("preset");
  });

  it("is a pollable feature", () => {
    expect(isFeature("color")).toBe(true);
  });

  const m = {
    persona: { name: "Maya", label: "", photo: "/demo/maya.jpg" },
    passport: { hairHex: "#5C3420", hairLength: "mid", brow: { preset: "SoftArch1", hex: "#564843" } },
    renders: {
      brow: { SoftArch1: "/demo/brow.jpg" },
      wig: { w1: "/demo/wig-w1.jpg" },
      hat: {},
      browOnWig: { w1: "/demo/brow-on-wig-w1.jpg" },
      dyed: { w1: "/demo/dyed-w1.jpg" },
      browOnDyed: { w1: "/demo/brow-on-dyed-w1.jpg" },
    },
  } as DemoManifest;
  const now = () => Promise.resolve();

  it("demo answers the dye and draws brows on the dyed wig", async () => {
    expect(await renderDemo(m, { feature: "color", wigId: "w1" }, now)).toBe("/demo/dyed-w1.jpg");
    expect(await renderDemo(m, { feature: "brow", wigId: "w1", dyed: true }, now)).toBe("/demo/brow-on-dyed-w1.jpg");
    expect(await renderDemo(m, { feature: "brow", wigId: "w1" }, now)).toBe("/demo/brow-on-wig-w1.jpg");
    expect(demoBrowOnWig(m, "w1", true)).toBe("/demo/brow-on-dyed-w1.jpg");
  });

  it("demo refuses a dye it has no render for", async () => {
    await expect(renderDemo(m, { feature: "color", wigId: "nope" }, now)).rejects.toThrow();
  });
});
