'use client'

import { pricingPlans } from '@/data/pricing'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold">Pricing Plans</h2>
        <p className="text-muted-foreground mt-2">
          Choose the plan that fits your needs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {pricingPlans.map((plan, idx) => (
          <Card
            key={idx}
            className="rounded-2xl border shadow-sm hover:shadow-lg transition"
          >
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {plan.description}
              </p>

              <div className="text-3xl font-bold mt-4">
                {plan.price}
                <span className="text-sm font-normal"> / month</span>
              </div>

              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((f, i) => (
                  <li key={i}>✔ {f}</li>
                ))}
              </ul>

              <Button className="w-full mt-6">
                Get Started
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}