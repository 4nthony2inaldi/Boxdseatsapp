"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveEventLog, type VenueResult, type EventMatch } from "@/lib/queries/log";
import StepVenue from "./StepVenue";
import StepDate from "./StepDate";
import StepEvent from "./StepEvent";
import StepDetails, { type DetailsData } from "./StepDetails";

type LogFlowProps = {
  userId: string;
  prefillVenue?: VenueResult;
};

const STEP_LABELS = ["Venue", "Date", "Event", "Details"];

export default function LogFlow({ userId, prefillVenue }: LogFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(prefillVenue ? 2 : 1);
  const [selectedVenue, setSelectedVenue] = useState<VenueResult | null>(prefillVenue || null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventMatch | null>(null);
  const [manualTitle, setManualTitle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Step 1: Venue selected
  const handleVenueSelect = (venue: VenueResult) => {
    setSelectedVenue(venue);
    setStep(2);
  };

  // Step 2: Date selected
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setStep(3);
  };

  // Step 3: Event selected (or manual)
  const handleEventSelect = (event: EventMatch | null, title?: string) => {
    setSelectedEvent(event);
    setManualTitle(title || null);
    setStep(4);
  };

  // Step 4: Save
  const handleSave = async (details: DetailsData) => {
    if (!selectedVenue || !selectedDate) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();

    const result = await saveEventLog(
      supabase,
      {
        user_id: userId,
        event_id: selectedEvent?.id || null,
        venue_id: selectedVenue.id,
        event_date: selectedDate,
        league_id: selectedEvent?.league_id || null,
        sport: selectedEvent?.sport || null,
        rating: details.rating,
        notes: details.notes || null,
        seat_location: details.seat_location || null,
        privacy: details.privacy,
        rooting_team_id: details.rooting_team_id,
        is_neutral: details.is_neutral,
        outcome: null, // computed by saveEventLog
        is_manual: !selectedEvent,
        manual_title: manualTitle,
        manual_description: null,
        companions: details.companions,
      },
      selectedEvent
    );

    setSaving(false);

    if ("error" in result) {
      setError(result.error);
    } else {
      setSuccess(true);
      // Navigate to profile after brief delay to show success
      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 1200);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto text-center">
        <div className="text-5xl mb-4">🎉</div>
        <div className="font-display text-2xl text-text-primary tracking-wider mb-2">
          EVENT LOGGED
        </div>
        <div className="text-sm text-text-secondary">
          Redirecting to your profile...
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-5 max-w-lg mx-auto">
      {/* Step progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;

          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-display shrink-0 ${
                    isCompleted
                      ? "bg-accent text-white"
                      : isActive
                        ? "bg-accent/20 text-accent border border-accent"
                        : "bg-bg-input text-text-muted border border-border"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`font-display text-[10px] tracking-[1px] uppercase ${
                    isActive
                      ? "text-accent"
                      : isCompleted
                        ? "text-text-secondary"
                        : "text-text-muted"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`h-px flex-1 min-w-[12px] ${
                    isCompleted ? "bg-accent/50" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step title */}
      <div className="font-display text-[22px] text-text-primary tracking-[1px] mb-1">
        {step === 1 && "Log Event"}
        {step === 2 && "Select Date"}
        {step === 3 && "Confirm Event"}
        {step === 4 && "Log Details"}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-loss/10 border border-loss/30 rounded-lg px-3 py-2 mb-4 text-sm text-loss">
          {error}
        </div>
      )}

      {/* Steps */}
      {step === 1 && (
        <StepVenue userId={userId} onSelect={handleVenueSelect} />
      )}

      {step === 2 && selectedVenue && (
        <StepDate
          venueId={selectedVenue.id}
          venueName={selectedVenue.name}
          onSelect={handleDateSelect}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && selectedVenue && selectedDate && (
        <StepEvent
          venueId={selectedVenue.id}
          venueName={selectedVenue.name}
          date={selectedDate}
          onSelect={handleEventSelect}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && selectedVenue && selectedDate && (
        <StepDetails
          userId={userId}
          selectedEvent={selectedEvent}
          manualTitle={manualTitle}
          venueName={selectedVenue.name}
          date={selectedDate}
          onSave={handleSave}
          onBack={() => setStep(3)}
          saving={saving}
        />
      )}
    </div>
  );
}
