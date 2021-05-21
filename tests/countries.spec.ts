import { countryName } from "../src/countries";

describe("Countries", function () {
  it("Known country", async () => {
    expect(countryName("US")).toBe("United States of America");
  });
  it("Unknown country", async () => {
    expect(countryName(null)).toBe("Unknown");
    expect(countryName("INVALID")).toBe("Unknown");
  });
});
