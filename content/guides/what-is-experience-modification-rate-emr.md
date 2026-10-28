---
title: "What Is an Experience Modification Rate (EMR)? Formula & Examples"
description: "Your experience modification rate (EMR) adjusts workers' comp premium based on claims history. See the NCCI formula, worked examples, and what moves your mod."
slug: "what-is-experience-modification-rate-emr"
coverImage: "https://images.unsplash.com/photo-1652303518372-79ad122e3181?fm=jpg&q=75&w=1200&h=630&fit=crop"
coverImageAlt: "Two construction workers in high-visibility vests talking beside an excavation on a jobsite"
ogImage: "https://images.unsplash.com/photo-1652303518372-79ad122e3181?fm=jpg&q=75&w=1200&h=630&fit=crop"
og_image_alt: "Two construction workers in high-visibility vests talking beside an excavation on a jobsite"
canonical: "https://emodanalyzer.com/what-is-experience-modification-rate-emr/"
date: "2026-10-22"
lastUpdated: "2026-10-22"
author: "CertifyMe.net"
author_type: "Organization"
author_url: "https://www.certifyme.net/about-certifyme/"
publisher_url: "https://www.certifyme.net/"
site_name: "CertifyMe.net"
kicker: "Workers' Comp Basics"
tags:
  - "experience modification rate"
  - "emr rating"
  - "experience mod"
  - "workers compensation"
  - "ncci"
---

# What Is an Experience Modification Rate (EMR)? Formula & Examples

An experience modification rate (EMR) is a number that raises or lowers your workers' compensation premium based on your own claims history. It goes by several names: EMR, EMR rating, experience mod, experience modifier, e-mod, X-Mod, or simply "your mod." In workers' comp, EMR always means experience modification rate, not electronic medical record.

The number shows up on your renewal, on your rating worksheet, and for contractors, on bid prequalification forms. This guide explains what the number means, how the National Council on Compensation Insurance (NCCI) actually calculates it, why several small claims usually hurt more than one large claim, and how to check your own.

> **Key Takeaways**
>
> - An EMR compares your actual losses with the losses expected for a business of your size and classification. A mod of 1.0 is considered average, below 1.0 lowers your premium, and above 1.0 raises it.
> - NCCI splits every claim into a primary part, which counts in full, and an excess part, which counts only partially. That is why claim frequency moves a mod more than claim size.
> - Using the values from NCCI's own sample worksheet, the formula gives a mod of 0.90 for ten $5,000 claims and 0.77 for one $50,000 claim, even though both total $50,000.
> - A business with zero claims still cannot reach a mod of zero. The floor depends mostly on how large the business is.

<!-- blog-hygiene:toc:begin -->
**In this article:**

- [What Is an Experience Modification Rate?](#what-is-an-experience-modification-rate)
- [What Does Your EMR Number Mean?](#what-does-your-emr-number-mean)
- [How Is an Experience Modification Rate Calculated?](#how-is-an-experience-modification-rate-calculated)
- [Why Do Several Small Claims Hurt More Than One Big One?](#why-do-several-small-claims-hurt-more-than-one-big-one)
- [What Is the Lowest EMR Possible?](#what-is-the-lowest-emr-possible)
- [What Changed in 2024? State-Specific Split Points](#what-changed-in-2024-state-specific-split-points)
- [Does EMR Work the Same in Every State?](#does-emr-work-the-same-in-every-state)
- [How Can You Lower Your EMR?](#how-can-you-lower-your-emr)
- [How Do You Find and Check Your EMR?](#how-do-you-find-and-check-your-emr)
- [Frequently Asked Questions](#frequently-asked-questions)
- [The Bottom Line](#the-bottom-line)

<!-- blog-hygiene:toc:end -->

## What Is an Experience Modification Rate?

An experience modification rate is a multiplier on your workers' comp premium that compares your claims experience with the average employer of similar size in your classification. It rewards a strong safety record and charges more for a weak one. In most states, the mod is calculated by the National Council on Compensation Insurance. NCCI's guide to the system, the [ABCs of Experience Rating](https://www.ncci.com/Articles/Documents/UW_ABC_Exp_Rating.pdf), describes it as a method that "recognizes the differences among qualifying employers with respect to safety and loss prevention," using each employer's own payroll and loss records.

Experience rating is mandatory once your business qualifies. Each state sets a premium threshold, and you meet it in one of two ways: enough premium in the most recent 24 months, or enough on average across your whole experience period. If you don't qualify, or you're a new business with no data, you get a mod of 1.0.

The scale is large. NCCI reported calculating about 1.2 million experience mods a year for roughly 740,000 qualifying employers, based on 2019 figures ([NCCI presentation to NCOIL](https://ncoil.org/wp-content/uploads/2020/12/20201211-NCOIL-Presentation-Basics-of-Experience-Rating.pdf), December 2020).

## What Does Your EMR Number Mean?

Insurance companies apply your EMR directly to your insurance premium, so a 0.75 mod means you pay 75% of the premium you'd otherwise owe. By design, 1.0 is the average EMR for employers like yours. NCCI uses three terms:

- **Unity mod (1.0):** an EMR of 1.0 means your losses match what's expected for a business like yours. Your premium is unchanged.
- **Credit mod (below 1.0):** an EMR below 1.0 means your losses are better than expected. Your premium goes down.
- **Debit mod (above 1.0):** your losses are worse than expected. A higher EMR means higher premiums.

<figure>
  <svg viewBox="0 0 560 260" width="560" height="260" role="img">
    <title>Same $100,000 premium, three different mods</title>
    <desc>Horizontal bar chart. A $100,000 premium becomes $75,000 at a 0.75 mod, stays $100,000 at a 1.0 mod, and becomes $125,000 at a 1.25 mod. Source: NCCI, ABCs of Experience Rating, Exhibit E.</desc>
    <text x="280" y="22" text-anchor="middle" font-size="14" fill="currentColor">Same $100,000 premium, three different mods</text>
    <rect x="170" y="50" width="180" height="40" fill="#10b981"></rect>
    <text x="160" y="75" text-anchor="end" font-size="12" fill="currentColor">Mod 0.75 (credit)</text>
    <text x="358" y="75" text-anchor="start" font-size="12" fill="currentColor">$75,000</text>
    <rect x="170" y="110" width="240" height="40" fill="#64748b"></rect>
    <text x="160" y="135" text-anchor="end" font-size="12" fill="currentColor">Mod 1.0 (unity)</text>
    <text x="418" y="135" text-anchor="start" font-size="12" fill="currentColor">$100,000</text>
    <rect x="170" y="170" width="300" height="40" fill="#f97316"></rect>
    <text x="160" y="195" text-anchor="end" font-size="12" fill="currentColor">Mod 1.25 (debit)</text>
    <text x="478" y="195" text-anchor="start" font-size="12" fill="currentColor">$125,000</text>
    <text x="280" y="245" text-anchor="middle" font-size="10" fill="currentColor">Source: NCCI, ABCs of Experience Rating, Exhibit E</text>
  </svg>
  <figcaption>Premium after the mod is applied to $100,000 of premium. Source: <a href="https://www.ncci.com/Articles/Documents/UW_ABC_Exp_Rating.pdf">NCCI, ABCs of Experience Rating</a>.</figcaption>
</figure>

The dollars add up quickly. NCCI's guide shows a roofing company with $126,865 of premium and a 1.25 mod paying $158,581, an extra $31,716 for the year. Your final bill can also reflect schedule credits, discounts, and other factors outside the mod.

For contractors, the mod matters beyond price, since some project owners and general contractors screen bidders by it (some bid forms call it an EMR score). There is no single "good" EMR across every buyer, so check the requirement in each bid package instead of relying on a rule of thumb. Our guide to [what EMR contractors need to bid](https://emodanalyzer.com/emr-in-construction/) covers real owner requirements and the states that restrict EMR cutoffs.

## How Is an Experience Modification Rate Calculated?

The calculation compares your actual losses with your expected losses, after splitting each claim into a primary part and an excess part and adding stabilizing values. NCCI's own presentation materials call "actual divided by expected" a [simplified formula](https://ncoil.org/wp-content/uploads/2020/12/20201211-NCOIL-Presentation-Basics-of-Experience-Rating.pdf); the real one has a few more parts.

**Step 1: Expected losses.** Each job classification has an expected loss rate (ELR) per $100 of payroll. In NCCI's example, an ELR of 3.50 on $250,000 of payroll gives $8,750 of expected losses. A discount ratio (D-ratio) then sets how much of that is expected primary loss: $8,750 × 0.27 = $2,363.

**Step 2: Split actual claims.** Each claim is divided at a split point. The amount up to the split point is primary loss, which NCCI says "reflects frequency." The amount above it is excess loss, which "reflects severity." A state per-claim accident limitation also caps very large claims. In NCCI's example, a $500,000 claim counts as only $250,000.

**Step 3: Weight and stabilize.** NCCI sets two more values based on your state and size. The weight (W) decides how much excess losses count. NCCI says it "is a small percentage for small employers and increases with the size of the employer." The ballast (B) is a stabilizing amount that keeps any single loss from swinging the mod too far.

The full formula looks like this:

`EMR = (Actual primary + W × Actual excess + (1 − W) × Expected excess + Ballast) ÷ (Expected losses + Ballast)`

Here is how the terms map to the fields on an NCCI worksheet:

<table>
<thead>
<tr><th>Worksheet field</th><th>What it means</th><th>Role in the formula</th></tr>
</thead>
<tbody>
<tr><td>ELR</td><td>Expected loss rate per $100 of payroll for each class code</td><td>Payroll ÷ 100 × ELR = expected losses</td></tr>
<tr><td>D-Ratio</td><td>Share of expected losses that are expected primary losses</td><td>Splits expected losses into primary and excess</td></tr>
<tr><td>Act Prim Losses</td><td>Your claims up to the split point</td><td>Counted in full</td></tr>
<tr><td>Act Exc Losses</td><td>Your claims above the split point</td><td>Multiplied by W</td></tr>
<tr><td>Wt</td><td>Weight given to excess losses</td><td>W in the formula</td></tr>
<tr><td>Ballast</td><td>Stabilizing value from NCCI tables</td><td>Added to both sides</td></tr>
<tr><td>O / F</td><td>Whether a claim is open or final</td><td>Open claims count at their current reserve</td></tr>
</tbody>
</table>

**Which years count.** NCCI says the experience period is "generally based on three years of payroll and loss data." It uses policies that started between 21 and 57 months before your mod's effective date. In practice, that usually means three years of claims, excluding the most recent policy year, because the current policy period's data isn't valued and reported yet.

<figure>
  <svg viewBox="0 0 560 300" width="560" height="300" role="img">
    <title>Which policy years count toward a January 1, 2026 mod</title>
    <desc>Timeline chart for a business that renews every January 1. The 2022, 2023, and 2024 policy years count toward a mod effective January 1, 2026, because they started between April 1, 2021 and April 1, 2024. The 2025 policy is the current term and is not used. Rule source: NCCI, ABCs of Experience Rating.</desc>
    <text x="280" y="20" text-anchor="middle" font-size="14" fill="currentColor">Which policy years count toward a 1/1/2026 mod</text>
    <line x1="520" y1="50" x2="520" y2="200" stroke="#f97316" stroke-width="2"></line>
    <text x="514" y="44" text-anchor="end" font-size="10" fill="currentColor">Mod effective 1/1/2026</text>
    <rect x="168" y="60" width="88" height="28" fill="#0d9488"></rect>
    <text x="160" y="79" text-anchor="end" font-size="11" fill="currentColor">2022 policy</text>
    <rect x="256" y="96" width="88" height="28" fill="#0d9488"></rect>
    <text x="248" y="115" text-anchor="end" font-size="11" fill="currentColor">2023 policy</text>
    <rect x="344" y="132" width="88" height="28" fill="#0d9488"></rect>
    <text x="336" y="151" text-anchor="end" font-size="11" fill="currentColor">2024 policy</text>
    <rect x="432" y="168" width="88" height="28" fill="#9ca3af"></rect>
    <text x="424" y="187" text-anchor="end" font-size="11" fill="currentColor">2025 policy (not used)</text>
    <line x1="102" y1="212" x2="366" y2="212" stroke="#0d9488" stroke-width="2"></line>
    <line x1="102" y1="205" x2="102" y2="219" stroke="#0d9488" stroke-width="2"></line>
    <line x1="366" y1="205" x2="366" y2="219" stroke="#0d9488" stroke-width="2"></line>
    <text x="234" y="232" text-anchor="middle" font-size="10" fill="currentColor">Policies starting 4/1/2021 to 4/1/2024 count (57 to 21 months back)</text>
    <line x1="80" y1="250" x2="520" y2="250" stroke="#9ca3af" stroke-width="1"></line>
    <text x="80" y="266" text-anchor="middle" font-size="10" fill="currentColor">2021</text>
    <text x="168" y="266" text-anchor="middle" font-size="10" fill="currentColor">2022</text>
    <text x="256" y="266" text-anchor="middle" font-size="10" fill="currentColor">2023</text>
    <text x="344" y="266" text-anchor="middle" font-size="10" fill="currentColor">2024</text>
    <text x="432" y="266" text-anchor="middle" font-size="10" fill="currentColor">2025</text>
    <text x="520" y="266" text-anchor="middle" font-size="10" fill="currentColor">2026</text>
    <text x="280" y="292" text-anchor="middle" font-size="10" fill="currentColor">Rule: NCCI, ABCs of Experience Rating. Dates show a January 1 renewal.</text>
  </svg>
  <figcaption>For a business that renews every January 1. NCCI's guide gives the same pattern for a 2021 mod, which used the 2017 to 2019 policy years. Source: <a href="https://www.ncci.com/Articles/Documents/UW_ABC_Exp_Rating.pdf">NCCI, ABCs of Experience Rating</a>.</figcaption>
</figure>

Your worksheet also shows a status. A *preliminary* mod uses last year's approved rating values until your state's new ones arrive. A *contingent* mod is waiting on audited payroll or loss data. A *final* mod has everything.

## Why Do Several Small Claims Hurt More Than One Big One?

Several small claims hurt more because the formula treats frequency and severity differently: primary losses count in full while excess losses are weighted down. A claim under the split point is all primary loss, while most of a large claim is excess. NCCI's guide makes the comparison itself: an employer with ten $5,000 losses "receives a much higher mod" than one with a single $50,000 loss. It just doesn't show the numbers.

<!-- [UNIQUE INSIGHT] -->
Here they are, calculated with the values from NCCI's own published "Any Insured" sample worksheet: expected losses of $176,190, expected primary losses of $56,172, a weight of 0.14, ballast of $47,400, and NCCI's $18,000 split point from that edition. Those inputs reproduce the 1.00 mod NCCI printed on that worksheet. The scenarios assume none of the claims are medical-only.

<table>
<thead>
<tr><th>Same sample employer</th><th>Actual primary</th><th>Actual excess</th><th>Resulting mod</th></tr>
</thead>
<tbody>
<tr><td>No claims at all</td><td>$0</td><td>$0</td><td>0.67</td></tr>
<tr><td>Ten $5,000 claims</td><td>$50,000</td><td>$0</td><td>0.90</td></tr>
<tr><td>One $50,000 claim</td><td>$18,000</td><td>$32,000</td><td>0.77</td></tr>
</tbody>
</table>

<figure>
  <svg viewBox="0 0 560 360" width="560" height="360" role="img">
    <title>Same $50,000 in losses, different mods</title>
    <desc>Grouped bar chart. Ten $5,000 claims produce $50,000 of primary losses and $0 of excess losses, for a mod of 0.90. One $50,000 claim produces $18,000 of primary losses and $32,000 of excess losses, for a mod of 0.77. Calculated with NCCI's published sample worksheet values: weight 0.14, ballast $47,400, split point $18,000.</desc>
    <text x="280" y="20" text-anchor="middle" font-size="14" fill="currentColor">Same $50,000 in losses, different mods</text>
    <text x="280" y="38" text-anchor="middle" font-size="11" fill="currentColor">Primary vs. excess losses on NCCI's sample worksheet</text>
    <rect x="96" y="52" width="12" height="12" fill="#2563eb"></rect>
    <text x="114" y="62" text-anchor="start" font-size="11" fill="currentColor">Primary (counts in full)</text>
    <rect x="300" y="52" width="12" height="12" fill="#f59e0b"></rect>
    <text x="318" y="62" text-anchor="start" font-size="11" fill="currentColor">Excess (weighted at 0.14)</text>
    <rect x="110" y="80" width="60" height="210" fill="#2563eb"></rect>
    <text x="140" y="75" text-anchor="middle" font-size="11" fill="currentColor">$50,000</text>
    <text x="210" y="284" text-anchor="middle" font-size="11" fill="currentColor">$0</text>
    <rect x="330" y="214" width="60" height="76" fill="#2563eb"></rect>
    <text x="360" y="208" text-anchor="middle" font-size="11" fill="currentColor">$18,000</text>
    <rect x="400" y="156" width="60" height="134" fill="#f59e0b"></rect>
    <text x="430" y="150" text-anchor="middle" font-size="11" fill="currentColor">$32,000</text>
    <line x1="80" y1="290" x2="500" y2="290" stroke="#9ca3af" stroke-width="1"></line>
    <text x="175" y="308" text-anchor="middle" font-size="12" fill="currentColor">Ten $5,000 claims</text>
    <text x="395" y="308" text-anchor="middle" font-size="12" fill="currentColor">One $50,000 claim</text>
    <text x="175" y="328" text-anchor="middle" font-size="14" fill="currentColor">Mod 0.90</text>
    <text x="395" y="328" text-anchor="middle" font-size="14" fill="currentColor">Mod 0.77</text>
    <text x="280" y="352" text-anchor="middle" font-size="10" fill="currentColor">Calculated with NCCI's sample values: weight 0.14, ballast $47,400, split point $18,000</text>
  </svg>
  <figcaption>Both employers have $50,000 in losses. Inputs from the sample worksheet in <a href="https://www.ncci.com/Articles/Documents/UW_ABC_Exp_Rating.pdf">NCCI's ABCs of Experience Rating</a>; mods calculated with the formula above.</figcaption>
</figure>

NCCI's reasoning is that "the cost of a specific accident is often left to chance," while the fact that an accident happened says more about future losses. Ten separate injuries suggest a pattern. One large claim may be bad luck.

That doesn't make severity irrelevant. Claims are getting more expensive: NCCI's 2026 State of the Line report estimated that lost-time claim frequency fell about 2% in 2025 (a preliminary figure), while medical and indemnity severity each rose about 4% ([Business Insurance](https://www.businessinsurance.com/comp-posts-91-combined-ratio-in-2025-extends-underwriting-gains-ncci/), May 12, 2026). NCCI's 2020 presentation describes the split point as [indexed annually](https://ncoil.org/wp-content/uploads/2020/12/20201211-NCOIL-Presentation-Basics-of-Experience-Rating.pdf), so the line between primary and excess losses moves as claim costs change.

**Medical-only claims get a discount.** Most states have approved NCCI's Experience Rating Adjustment, which counts only 30% of a medical-only claim. In NCCI's example, a $20,000 medical-only claim splits into $18,000 primary and $2,000 excess, and only $5,400 and $600 enter the mod. Your agent can confirm whether your state applies it.

## What Is the Lowest EMR Possible?

No business can reach a mod of zero, because the ballast and the expected excess losses stay in the formula even when you have no claims. NCCI's sample employer, with zero losses, would land at about 0.67. That's its floor.

<!-- [UNIQUE INSIGHT] -->
The floor depends mostly on size. Employers with larger payrolls have more expected losses and get a higher weight, so their own record counts for more and their floor sits lower. Smaller employers have less credible data, so the formula keeps their mod closer to 1.0 in both directions. NCCI describes the goal as tempering "the debit due to such a loss, as well as the credit for having no losses."

This is worth knowing before you set a target. If your floor is 0.85, a 0.88 mod is close to the best you can earn. You can [calculate your loss-free minimum mod](https://emodanalyzer.com/) from your own worksheet, to see how much of your mod comes from claims and how much comes from the size of your business.

## What Changed in 2024? State-Specific Split Points

The split point is no longer set at the same value across most NCCI states. Under NCCI Item E-1409, each state now has its own split point, along with revised per-claim limits, a revised G value (a measure of state average claim severity), new credibility values behind the weight and ballast, and updated discount ratios. The formula and its structure did not change. NCCI proposed the changes for new and renewal policies effective on or after July 1, 2024, though states adopted them on their own dates ([Texas Department of Insurance filing notice](https://www.tdi.texas.gov/rules/2022/documents/e1409notice.pdf), filed October 18, 2022).

Before this change, NCCI's guide cited a split point of "$18,000 in most states." Now the same claim can split differently depending on where it happened, so ask your agent for your state's current value instead of using a number from an older article.

## Does EMR Work the Same in Every State?

No. NCCI runs experience rating in most states, but several states have their own rating bureaus, and four run monopolistic state funds.

<p><img src="images/jobsite-supervisors.webp" alt="Two construction supervisors in hard hats and safety vests reviewing a large building site" width="1280" height="720" loading="lazy"></p>

According to the 2021 edition of NCCI's guide, 39 jurisdictions had approved its plan. A few states join only for interstate ratings or produce their own mods:

- **NCCI plan does not apply:** California, Delaware, Michigan, New Jersey, and Pennsylvania, plus the four monopolistic states (North Dakota, Ohio, Washington, and Wyoming).
- **Interstate ratings only:** Minnesota and Wisconsin take part only when an employer has exposure in two or more participating states. The 2021 guide also listed New York here, but New York has since withdrawn (see below).
- **Plan applies, own intrastate mods:** Indiana, Massachusetts, and North Carolina.

California is the one you're most likely to run into, because the [Workers' Compensation Insurance Rating Bureau of California](https://www.wcirb.com/) runs its own experience rating system. New York has withdrawn from NCCI's interstate plan: under NCCI Item E-1408, New York experience is no longer used in interstate mods with rating effective dates on or after October 1, 2022 ([Texas Commissioner of Insurance order approving the filing](https://tdi.texas.gov/rules/2021/documents/20227291.pdf), April 8, 2022). The New York Compensation Insurance Rating Board (NYCIRB) rates New York exposure separately. Participation rules keep changing, so confirm your state's current status with your agent or rating bureau.

If you operate in more than one participating state, NCCI issues a single interstate mod that combines your payroll and losses across those states. If you operate in only one, you get an intrastate mod.

## How Can You Lower Your EMR?

You lower an EMR mainly by having fewer claims, and then by keeping the claims you do have from growing. NCCI's guide says experience rating "provides an incentive for employers to develop loss prevention as well as incentives to have the injured employees return to work as soon as reasonably possible," and notes that employer involvement can reduce the severity of losses once they've happened.

- **Cut claim frequency first.** Because primary losses count in full, preventing a handful of small injuries usually moves the mod more than anything else. A safety program and training aimed at your most common injuries is the main tool.
- **Get injured workers back quickly.** A return-to-work program can keep a claim smaller, and less of a smaller claim lands above the split point.
- **Report every claim.** NCCI says the 70% medical-only reduction "decreases the incentive for employers to pay medical-only claims without reporting them to the insurance provider." With that reduction in place, a reported medical-only claim already counts at only 30%.
- **Check the worksheet.** Misclassified payroll, outdated reserves, or a missing medical-only reduction can all distort a mod. Ask your insurance agent about anything that looks wrong.
- **Be patient.** A claim stays in the calculation for about three policy years, so a lower EMR usually shows up gradually.

## How Do You Find and Check Your EMR?

Your agent, broker, or carrier can give you your current mod and the experience rating worksheet behind it. In some states, NCCI also sends notice of the mod to the employer directly.

Once you have the worksheet, a few things are worth checking:

- **Payroll by class code.** Wrong classifications change your expected losses.
- **Open claims.** Claims marked "O" count at their current reserve, which may differ from what the claim finally costs.
- **Medical-only claims.** These are coded injury type 6 and should get the 70% reduction where it applies.
- **Grouped small claims.** Claims of $2,000 or less may be grouped together by injury type.
- **Ownership changes.** NCCI requires them to be reported to your insurer in writing within 90 days, and businesses with more than 50% common majority ownership are combined into one mod.

For a field-by-field walkthrough, see [how to check your rating worksheet for errors](https://emodanalyzer.com/how-to-read-experience-mod-worksheet/).

You can also [recalculate your experience mod from your NCCI worksheet](https://emodanalyzer.com/) with the free Experience Mod Analyzer. It reads the worksheet in your browser and recalculates the mod from scratch. It checks the worksheet's own arithmetic, shows what each claim costs in mod points and estimated premium, and flags open reserves worth asking about. Your PDF is never uploaded. The tool works only from the worksheet itself, so treat what it finds as questions for your agent or carrier, not confirmed errors.

## Frequently Asked Questions

### What is a good experience modification rate?

Any mod below 1.0 is a credit, meaning your losses beat the average for businesses like yours. What counts as "good enough" depends on who's asking: some project owners and general contractors set their own maximum mod for bidders, so check each bid's requirement.

### Can one large claim ruin my EMR?

Usually not as much as people fear. Using the values from NCCI's sample worksheet, one $50,000 claim works out to a 0.77 mod, while ten $5,000 claims work out to 0.90. Only the first portion of a large claim counts in full, and a state per-claim limit caps the rest.

### How long does a claim affect my EMR?

Generally three policy years. A claim first shows up in the mod calculated about two years after its policy started, because NCCI uses policies that began 21 to 57 months before the mod's effective date.

### Is an EMR the same as an OSHA incident rate?

No. An EMR is an insurance pricing measure based on claim costs. OSHA incident rates come from injury and illness recordkeeping. Both reflect safety, but they're calculated differently.

### Does EMR work differently in California?

Yes. NCCI's plan does not apply in California. The Workers' Compensation Insurance Rating Bureau of California runs its own experience rating system.

## The Bottom Line

Your experience modification rate is a size-adjusted comparison of your claims with the claims expected for a business like yours, applied directly to your premium. Frequency matters more than size, every business has a floor, and since 2024 the split point depends on your state.

If you have a rating worksheet, the fastest way to understand your own number is to [see which claims are driving your mod](https://emodanalyzer.com/) and what they cost. If safety is the lever you need, CertifyMe.net also offers OSHA-compliant [forklift operator training](https://www.certifyme.net/), and its guide to the [top 10 OSHA safety violations](https://www.certifyme.net/osha-blog/top-10-osha-safety-violations/) covers the hazards behind many common claims.

---

**About this guide:** Published by [CertifyMe.net](https://www.certifyme.net/about-certifyme/), which built the free Experience Mod Analyzer and offers safety training and compliance products, including forklift and aerial lift operator courses. Facts in this guide come from NCCI's [ABCs of Experience Rating](https://www.ncci.com/Articles/Documents/UW_ABC_Exp_Rating.pdf), NCCI's 2020 [presentation on experience rating](https://ncoil.org/wp-content/uploads/2020/12/20201211-NCOIL-Presentation-Basics-of-Experience-Rating.pdf), and the [Texas Department of Insurance](https://www.tdi.texas.gov/rules/2022/documents/e1409notice.pdf), and are linked where they're used. This guide is general information, not legal, actuarial, or insurance advice. NCCI is a registered trademark of the National Council on Compensation Insurance, which is not affiliated with and does not endorse CertifyMe.net or the Experience Mod Analyzer. Questions or corrections? [Contact CertifyMe.net](https://www.certifyme.net/contact-us/).
