"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarCheck2, Check, ChevronLeft, ChevronRight, Loader2, MapPin, PartyPopper, UserRound, Users } from "lucide-react";
import { createBookingAction, getProfessionalsAction, getSlotsAction, type PublicProfessional } from "@/lib/actions/customer";
import { CARE_TYPES } from "@/lib/labels";
import { DURATION_OPTIONS, durationLabel } from "@/lib/booking/slots";
import { cn } from "@/lib/utils";

type Svc = { id: string; name: string; summary: string; image: string | null; min: number; max: number; def: number; category: string };
type Opt = { id: string; label: string; sub: string; isDefault?: boolean };
type NewAddress = { label: string; line1: string; line2: string; city: string; region: string; postalCode: string; accessNotes: string };

const STEPS = ["Service", "Care type", "Who it’s for", "Location", "Date & time", "Professional", "Review"] as const;

export function BookingWizard(props: { services: Svc[]; dependents: Opt[]; addresses: Opt[]; me: string; tz: string; firstDate: string; lastDate: string; allowProfessional: boolean }) {
  const { services, dependents, addresses, me, tz, firstDate, lastDate, allowProfessional } = props;
  const steps = STEPS.filter((s) => allowProfessional || s !== "Professional");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [serviceId, setServiceId] = useState("");
  const [careType, setCareType] = useState("");
  const [duration, setDuration] = useState(0);
  const [dependentId, setDependentId] = useState<string | null>(null); // "" = myself
  const [addressId, setAddressId] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "new");
  const [addr, setAddr] = useState<NewAddress>({ label: "Home", line1: "", line2: "", city: "", region: "CA", postalCode: "", accessNotes: "" });
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [start, setStart] = useState("");
  const [pros, setPros] = useState<PublicProfessional[] | null>(null);
  const [proId, setProId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);

  const svc = services.find((s) => s.id === serviceId);
  const durations = useMemo(() => (svc ? DURATION_OPTIONS.filter((d) => d >= svc.min && d <= svc.max) : []), [svc]);
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: tz, ...o }).format(new Date(iso));
  const name = steps[step];

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  // Load time slots when the date / service / duration changes.
  useEffect(() => {
    if (!date || !serviceId || !duration) return;
    let live = true;
    setSlots(null);
    getSlotsAction(serviceId, date, duration).then((s) => live && setSlots(s));
    return () => {
      live = false;
    };
  }, [date, serviceId, duration]);

  // Load available professionals for the chosen slot.
  useEffect(() => {
    if (name !== "Professional" || !start) return;
    let live = true;
    setPros(null);
    getProfessionalsAction(serviceId, start, duration).then((p) => {
      if (!live) return;
      setPros(p);
      if (proId && !p.some((x) => x.id === proId)) setProId("");
    });
    return () => {
      live = false;
    };
  }, [name, start, serviceId, duration, proId]);

  const addrValid = addressId !== "new" || (addr.line1.trim() && addr.city.trim() && /^[A-Za-z]{2}$/.test(addr.region) && /^\d{5}$/.test(addr.postalCode));
  const canNext: Record<string, boolean> = {
    Service: Boolean(serviceId),
    "Care type": Boolean(careType && duration),
    "Who it’s for": dependentId !== null,
    Location: Boolean(addrValid),
    "Date & time": Boolean(start),
    Professional: true,
    Review: true,
  };

  const go = (d: number) => {
    setError("");
    setDir(d);
    setStep((s) => Math.min(steps.length - 1, Math.max(0, s + d)));
  };

  const submit = () =>
    startTransition(async () => {
      setError("");
      const res = await createBookingAction({
        serviceId,
        careType,
        durationMinutes: duration,
        start,
        dependentId: dependentId ?? "",
        addressId: addressId === "new" ? "" : addressId,
        newAddress: addressId === "new" ? { ...addr, line2: addr.line2, accessNotes: addr.accessNotes, region: addr.region.toUpperCase(), save: true } : null,
        preferredEmployeeId: proId,
        instructions,
      });
      if (res.ok) setDone(res.reference);
      else setError(res.error + (res.fields ? ` (${Object.values(res.fields).join(" ")})` : ""));
    });

  if (done) {
    return (
      <m.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2rem] border border-teal-200 bg-white p-8 text-center shadow-lift sm:p-12">
        <m.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }} className="mx-auto grid size-16 place-items-center rounded-2xl bg-teal-50 text-teal-700">
          <PartyPopper aria-hidden className="size-8" />
        </m.div>
        <h2 className="mt-6 font-display text-3xl font-semibold text-navy-950" role="status">
          Booking request received
        </h2>
        <p className="mt-3 text-muted">
          Your reference is <span className="font-mono font-semibold text-navy-950">{done}</span>. We’ve emailed a confirmation and our team will review it and assign a care professional — you’ll be notified at each step.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/customer/bookings/${done}/`} className="inline-flex h-12 items-center gap-2 rounded-full bg-teal-700 px-6 text-sm font-semibold text-white hover:bg-teal-800">
            View booking <ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link href="/customer/dashboard/" className="inline-flex h-12 items-center rounded-full border border-line px-6 text-sm font-semibold text-navy-900 hover:border-navy-300">
            Back to overview
          </Link>
        </div>
      </m.div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 rounded-[2rem] border border-line bg-white shadow-soft">
        {/* Progress */}
        <div className="border-b border-line px-6 py-5 sm:px-8">
          <div className="flex items-center justify-between text-sm">
            <p className="font-semibold text-navy-950">
              Step {step + 1} of {steps.length}
            </p>
            <p className="text-muted">{name}</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} aria-label="Booking progress">
            <m.div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-700" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ type: "spring", stiffness: 160, damping: 24 }} />
          </div>
        </div>

        <div className="overflow-hidden px-6 py-7 sm:px-8">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <m.div key={name} custom={dir} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
              <h2 ref={heading} tabIndex={-1} className="font-display text-2xl font-semibold text-navy-950 outline-none">
                {
                  {
                    Service: "Which service do you need?",
                    "Care type": "What kind of care, and for how long?",
                    "Who it’s for": "Who is the care for?",
                    Location: "Where should we visit?",
                    "Date & time": "When should the visit start?",
                    Professional: "Would you like a specific professional?",
                    Review: "Review and send your request",
                  }[name]
                }
              </h2>

              <div className="mt-6">
                {name === "Service" && (
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Service">
                    {services.map((s) => (
                      <Choice key={s.id} checked={serviceId === s.id} onSelect={() => { setServiceId(s.id); setDuration(Math.min(Math.max(s.def, s.min), s.max)); setStart(""); }} title={s.name} sub={s.summary} media={s.image ? <Image src={s.image} alt="" width={56} height={56} className="size-14 rounded-xl object-cover" /> : undefined} />
                    ))}
                  </div>
                )}

                {name === "Care type" && (
                  <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Care type">
                      {CARE_TYPES.map((c) => (
                        <Choice key={c.value} checked={careType === c.value} onSelect={() => setCareType(c.value)} title={c.label} sub={c.description} />
                      ))}
                    </div>
                    <div>
                      <p id="dur-label" className="mb-2 text-sm font-semibold text-navy-900">
                        Visit length
                      </p>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="dur-label">
                        {durations.map((d) => (
                          <Pill key={d} checked={duration === d} onSelect={() => { setDuration(d); setStart(""); }}>
                            {durationLabel(d)}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {name === "Who it’s for" && (
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Care recipient">
                    <Choice checked={dependentId === ""} onSelect={() => setDependentId("")} title="Myself" sub={me} media={<IconBox><UserRound className="size-5" /></IconBox>} />
                    {dependents.map((d) => (
                      <Choice key={d.id} checked={dependentId === d.id} onSelect={() => setDependentId(d.id)} title={d.label} sub={d.sub} media={<IconBox><Users className="size-5" /></IconBox>} />
                    ))}
                    <Link href="/customer/dependents/" className="grid place-items-center rounded-2xl border border-dashed border-line p-5 text-sm font-semibold text-teal-700 hover:border-teal-300">
                      + Add a family member
                    </Link>
                  </div>
                )}

                {name === "Location" && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Address">
                      {addresses.map((a) => (
                        <Choice key={a.id} checked={addressId === a.id} onSelect={() => setAddressId(a.id)} title={a.label} sub={a.sub} media={<IconBox><MapPin className="size-5" /></IconBox>} />
                      ))}
                      <Choice checked={addressId === "new"} onSelect={() => setAddressId("new")} title="A new address" sub="It will be saved to your account." />
                    </div>
                    {addressId === "new" && (
                      <div className="grid gap-4 rounded-2xl bg-canvas p-5 sm:grid-cols-6">
                        <Input className="sm:col-span-6" label="Street address" value={addr.line1} onChange={(v) => setAddr({ ...addr, line1: v })} autoComplete="address-line1" />
                        <Input className="sm:col-span-6" label="Apt, suite (optional)" value={addr.line2} onChange={(v) => setAddr({ ...addr, line2: v })} autoComplete="address-line2" />
                        <Input className="sm:col-span-3" label="City" value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} autoComplete="address-level2" />
                        <Input className="sm:col-span-1" label="State" value={addr.region} onChange={(v) => setAddr({ ...addr, region: v.toUpperCase().slice(0, 2) })} autoComplete="address-level1" />
                        <Input className="sm:col-span-2" label="ZIP" value={addr.postalCode} onChange={(v) => setAddr({ ...addr, postalCode: v.replace(/\D/g, "").slice(0, 5) })} inputMode="numeric" autoComplete="postal-code" />
                        <Input className="sm:col-span-6" label="Name for this address" value={addr.label} onChange={(v) => setAddr({ ...addr, label: v })} />
                      </div>
                    )}
                  </div>
                )}

                {name === "Date & time" && (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <MonthPicker first={firstDate} last={lastDate} value={date} onChange={(d) => { setDate(d); setStart(""); }} />
                    <div>
                      <p className="mb-3 text-sm font-semibold text-navy-900">{date ? fmt(`${date}T12:00:00Z`, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }) : "Choose a date"}</p>
                      {!date ? (
                        <p className="rounded-2xl bg-canvas p-5 text-sm text-muted">Pick a day on the calendar to see start times.</p>
                      ) : slots === null ? (
                        <p className="flex items-center gap-2 text-sm text-muted" role="status">
                          <Loader2 aria-hidden className="size-4 animate-spin" /> Loading times…
                        </p>
                      ) : slots.length === 0 ? (
                        <p className="rounded-2xl bg-canvas p-5 text-sm text-muted">No start times are available on this day for a {durationLabel(duration).toLowerCase()} visit. Try another day.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Start time">
                          {slots.map((s, i) => (
                            <m.button
                              key={s}
                              type="button"
                              role="radio"
                              aria-checked={start === s}
                              onClick={() => setStart(s)}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(i, 16) * 0.015 }}
                              className={cn("h-11 rounded-xl border text-sm font-semibold tabular-nums transition-colors", start === s ? "border-teal-600 bg-teal-700 text-white" : "border-line bg-white text-navy-900 hover:border-teal-400")}
                            >
                              {fmt(s, { hour: "numeric", minute: "2-digit" })}
                            </m.button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {name === "Professional" && (
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Professional">
                    <Choice checked={proId === ""} onSelect={() => setProId("")} title="No preference" sub="We’ll match the best available professional for you." media={<IconBox><Users className="size-5" /></IconBox>} />
                    {pros === null ? (
                      <p className="flex items-center gap-2 p-5 text-sm text-muted" role="status">
                        <Loader2 aria-hidden className="size-4 animate-spin" /> Checking availability…
                      </p>
                    ) : pros.length === 0 ? (
                      <p className="rounded-2xl bg-canvas p-5 text-sm text-muted">No individual profiles are available to choose at this time — our team will match you.</p>
                    ) : (
                      pros.map((p) => (
                        <Choice
                          key={p.id}
                          checked={proId === p.id}
                          onSelect={() => setProId(p.id)}
                          title={p.displayName}
                          sub={[p.headline, p.yearsExperience ? `${p.yearsExperience}+ yrs` : "", p.skills.join(" · ")].filter(Boolean).join(" — ")}
                          media={
                            p.avatarFileId ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/api/files/${p.avatarFileId}/`} alt="" className="size-12 rounded-full object-cover" />
                            ) : (
                              <IconBox><UserRound className="size-5" /></IconBox>
                            )
                          }
                        />
                      ))
                    )}
                  </div>
                )}

                {name === "Review" && (
                  <div className="space-y-5">
                    <dl className="grid gap-4 rounded-2xl bg-canvas p-5 text-sm sm:grid-cols-2">
                      <Row label="Service" value={svc?.name} onEdit={() => { setDir(-1); setStep(0); }} />
                      <Row label="Care type" value={`${CARE_TYPES.find((c) => c.value === careType)?.label} · ${durationLabel(duration)}`} onEdit={() => { setDir(-1); setStep(1); }} />
                      <Row label="For" value={dependentId ? dependents.find((d) => d.id === dependentId)?.label : `Myself (${me})`} onEdit={() => { setDir(-1); setStep(2); }} />
                      <Row label="Location" value={addressId === "new" ? `${addr.line1}, ${addr.city}, ${addr.region} ${addr.postalCode}` : addresses.find((a) => a.id === addressId)?.sub} onEdit={() => { setDir(-1); setStep(3); }} />
                      <Row label="Date & time" value={start ? `${fmt(start, { weekday: "short", month: "short", day: "numeric" })} · ${fmt(start, { hour: "numeric", minute: "2-digit" })} – ${fmt(new Date(new Date(start).getTime() + duration * 60000).toISOString(), { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}` : ""} onEdit={() => { setDir(-1); setStep(4); }} />
                      {allowProfessional && <Row label="Professional" value={proId ? pros?.find((p) => p.id === proId)?.displayName : "No preference"} onEdit={() => { setDir(-1); setStep(5); }} />}
                    </dl>
                    <div>
                      <label htmlFor="instructions" className="mb-1.5 block text-sm font-semibold text-navy-900">
                        Instructions for our team (optional)
                      </label>
                      <textarea id="instructions" rows={4} maxLength={2000} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full rounded-2xl border border-line px-4 py-3 text-[15px] outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15" placeholder="Routines, preferences, anything that helps us prepare. Please don’t include medical records." />
                    </div>
                    <p className="text-xs text-muted">This is a booking request. Our team reviews every request and confirms the professional and time with you before the visit.</p>
                  </div>
                )}
              </div>
            </m.div>
          </AnimatePresence>

          {error && (
            <p role="alert" className="enter mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
            <button type="button" onClick={() => go(-1)} disabled={step === 0 || pending} className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-navy-900 hover:bg-canvas disabled:invisible">
              <ArrowLeft aria-hidden className="size-4" /> Back
            </button>
            {name === "Review" ? (
              <button type="button" onClick={submit} disabled={pending} className="inline-flex h-12 items-center gap-2 rounded-full bg-teal-700 px-7 text-sm font-semibold text-white shadow-glow hover:bg-teal-800 disabled:opacity-70">
                {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <CalendarCheck2 aria-hidden className="size-4" />}
                {pending ? "Sending request…" : "Send booking request"}
              </button>
            ) : (
              <button type="button" onClick={() => go(1)} disabled={!canNext[name]} className="inline-flex h-12 items-center gap-2 rounded-full bg-navy-900 px-7 text-sm font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40">
                Continue <ArrowRight aria-hidden className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Steps rail */}
      <aside className="hidden xl:block">
        <ol className="sticky top-24 space-y-1 rounded-[2rem] border border-line bg-white p-4 shadow-soft">
          {steps.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm", i === step ? "bg-teal-50 font-semibold text-teal-900" : i < step ? "text-navy-900" : "text-muted")}>
              <span className={cn("grid size-6 place-items-center rounded-full text-xs font-bold", i < step ? "bg-teal-600 text-white" : i === step ? "bg-white text-teal-800 ring-2 ring-teal-500" : "bg-canvas")}>{i < step ? <Check aria-hidden className="size-3.5" /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function Choice({ checked, onSelect, title, sub, media }: { checked: boolean; onSelect: () => void; title: ReactNode; sub?: ReactNode; media?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
        checked ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20" : "border-line bg-white hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-soft",
      )}
    >
      {media}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-navy-950">{title}</span>
        {sub && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{sub}</span>}
      </span>
      <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors", checked ? "border-teal-600 bg-teal-600 text-white" : "border-line")}>{checked && <Check aria-hidden className="size-3" strokeWidth={3} />}</span>
    </button>
  );
}

const IconBox = ({ children }: { children: ReactNode }) => <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700">{children}</span>;

function Pill({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onSelect} className={cn("h-10 rounded-full border px-4 text-sm font-semibold transition-colors", checked ? "border-teal-600 bg-teal-700 text-white" : "border-line bg-white text-navy-900 hover:border-teal-400")}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, className, autoComplete, inputMode }: { label: string; value: string; onChange: (v: string) => void; className?: string; autoComplete?: string; inputMode?: "numeric" }) {
  const id = `addr-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label}
      </label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} inputMode={inputMode} className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-[15px] outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15" />
    </div>
  );
}

function Row({ label, value, onEdit }: { label: string; value?: ReactNode; onEdit: () => void }) {
  return (
    <div>
      <dt className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
        {label}
        <button type="button" onClick={onEdit} className="text-xs font-semibold normal-case tracking-normal text-teal-700 hover:underline">
          Edit
        </button>
      </dt>
      <dd className="mt-1 font-medium text-navy-950">{value || "—"}</dd>
    </div>
  );
}

/** Accessible month grid limited to the bookable window. Dates are plain YYYY-MM-DD strings. */
function MonthPicker({ first, last, value, onChange }: { first: string; last: string; value: string; onChange: (d: string) => void }) {
  const [month, setMonth] = useState(first.slice(0, 7));
  const [y, mo] = month.split("-").map(Number);
  const startWeekday = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const iso = (d: number) => `${month}-${String(d).padStart(2, "0")}`;
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, mo - 1 + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, 1)));
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={month <= first.slice(0, 7)} className="grid size-9 place-items-center rounded-full hover:bg-canvas disabled:opacity-30" aria-label="Previous month">
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <p className="font-semibold text-navy-950" aria-live="polite">
          {label}
        </p>
        <button type="button" onClick={() => shift(1)} disabled={month >= last.slice(0, 7)} className="grid size-9 place-items-center rounded-full hover:bg-canvas disabled:opacity-30" aria-label="Next month">
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted" aria-hidden>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={label}>
        {Array.from({ length: startWeekday }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = iso(i + 1);
          const disabled = d < first || d > last;
          const selected = d === value;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => onChange(d)}
              aria-pressed={selected}
              aria-label={new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))}
              className={cn("aspect-square rounded-xl text-sm font-semibold tabular-nums transition-colors", selected ? "bg-teal-700 text-white shadow-glow" : disabled ? "text-line" : "text-navy-900 hover:bg-teal-50")}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
