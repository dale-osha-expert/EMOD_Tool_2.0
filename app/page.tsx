import { EmodTool } from "@/components/EmodTool";
import { emailConfig } from "@/lib/email/send";
import { GuideCards } from "@/components/site/Guides";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import {
  Destinations,
  Disclaimer,
  Faqs,
  Glossary,
  Hero,
  HowItWorks,
} from "@/components/site/Sections";
import { buildSchema } from "@/lib/site/schema";

export default function Page() {
  return (
    <div className="@container min-h-dvh">
      <script
        type="application/ld+json"
        // Structured data must be in the served HTML, so it is written
        // directly rather than rendered by a client component.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSchema()) }}
      />

      <SiteHeader current="/" />

      <Hero />

      <main className="pt-6">
        <EmodTool chrome={false} emailEnabled={emailConfig() !== null} />
      </main>

      <HowItWorks />
      <GuideCards />
      <Faqs />
      <Glossary />
      <Destinations />

      <SiteFooter />

      <Disclaimer />
    </div>
  );
}
