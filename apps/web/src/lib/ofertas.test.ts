import { describe, expect, it } from "vitest";
import { separarSlug, slugDeOferta } from "./ofertas";

describe("dirección de una oferta", () => {
  it("el id va al final", () => {
    expect(slugDeOferta({ slug: "devops-norden", id: "m5r1k8vf" })).toBe("devops-norden-m5r1k8vf");
  });
  it("se separa por el último guion", () => {
    expect(separarSlug("frontend-junior-atlantica-labs-k7x2m9qa")).toEqual({
      slug: "frontend-junior-atlantica-labs",
      id: "k7x2m9qa",
    });
  });
  it("sin guion, todo es el id", () => {
    expect(separarSlug("k7x2m9qa")).toEqual({ slug: "", id: "k7x2m9qa" });
  });
});
