import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PricePosition } from "@/components/PricePosition";
import { ChartNote } from "@/components/ChartNote";
import { HowToRead } from "@/components/HowToRead";
import { ProductTrends } from "@/components/ProductTrends";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — Smeg Whitespace Map" }] }),
  component: () => (
    <AppShell
      eyebrow="03 — Pricing"
      title={
        <>
          Is Smeg priced <em className="text-primary">right?</em>
        </>
      }
      lede="Smeg against every brand in the 88 most popular products per category on Prisjakt: popularity rank, price and premium."
    >
      <PricePosition />
      <ChartNote
        shows={
          <>
            For each category: where Smeg's best product ranks in popularity on Prisjakt, and how
            much more Smeg costs than the typical product.
          </>
        }
        soWhat={
          <>
            Green rows: shoppers already pick Smeg at a premium, so don't discount. Amber rows: Smeg
            isn't expensive there but nobody looks at it, so fix placement and visibility first.
          </>
        }
      />
      <div className="mt-10">
        <HowToRead
          items={[
            {
              term: "Popularity rank",
              text: (
                <>
                  Position in Prisjakt's own "most popular" list for the category. #1 = Smeg's
                  product is listed first.
                </>
              ),
            },
            {
              term: "Premium ×",
              text: (
                <>
                  Smeg's typical price ÷ the typical price of all products in the category. ×2.5 =
                  2.5 times the typical price.
                </>
              ),
            },
            {
              term: "Popular and expensive",
              text: (
                <>
                  Buyers already choose Smeg at the higher price, so a discount would only give away
                  margin. Hold the price, keep it in stock.
                </>
              ),
            },
            {
              term: "Not expensive but low rank",
              text: (
                <>
                  Price is not the problem; buyers don't see Smeg. Work on shelf placement and
                  visibility before cutting price.
                </>
              ),
            },
          ]}
        />
      </div>
      <h2 className="mt-16 mb-6 font-display text-3xl">
        Product demand: what is rising, what is falling
      </h2>
      <ProductTrends />
    </AppShell>
  ),
});
