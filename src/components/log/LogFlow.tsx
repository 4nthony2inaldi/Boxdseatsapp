"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  saveEventLog,
  updateEventLog,
  type VenueResult,
  type EventMatch,
  type EditableEventLog,
} from "@/lib/queries/log";
import type { BadgeData } from "@/lib/queries/badges";
import StepVenue from "./StepVenue";
import StepDate from "./StepDate";
import StepEvent from "./StepEvent";
import StepDetails, { type DetailsData } from "./StepDetails";

type LogFlowProps = {
  userId: string;
  prefillVenue?: VenueResult;
  editLog?: EditableEventLog;
};

const STEP_LABELS = ["Venue", "Date", "Event", "Details"];

export default function LogFlow({ userId, prefillVenue, editLog }: LogFlowProps) {
  const router = useRouter();
  const isEditMode = !!editLog;

  const [step, setStep] = useState(editLog ? 4 : prefillVenue ? 2 : 1);
  const [selectedVenue, setSelectedVenue] = useState<VenueResult | null>(
    editLog?.venue || prefillVenue || null
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    editLog?.event_date || null
  );
  const [selectedEvent, setSelectedEvent] = useState<EventMatch | null>(
    editLog?.event || null
  );
  const [manualTitle, setManualTitle] = useState<string | null>(
    editLog?.manual_title || null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<BadgeData[]>([]);

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

    const logInput = {
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
      outcome: null as "win" | "loss" | "draw" | "neutral" | null,
      is_manual: !selectedEvent,
      manual_title: manualTitle,
      manual_description: null,
      companions: details.companions,
    };

    const result = isEditMode
      ? await updateEventLog(supabase, editLog!.id, logInput, selectedEvent)
      : await saveEventLog(supabase, logInput, selectedEvent);

    setSaving(false);

    if ("error" in result) {
      setError(result.error);
    } else {
      const newBadges = (result as { newBadges?: BadgeData[] }).newBadges;
      const hasBadges = newBadges && newBadges.length > 0;
      if (hasBadges) {
        setEarnedBadges(newBadges);
      }
      setSuccess(true);
      setTimeout(() => {
        if (isEditMode && editLog?.event_id) {
          router.push(`/event/${editLog.event_id}`);
        } else {
          router.push("/profile");
        }
        router.refresh();
      }, hasBadges ? 2500 : 1200);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto text-center">
        <div className="text-5xl mb-4">{isEditMode ? "✅" : "🎉"}</div>
        <div className="font-display text-2xl text-text-primary tracking-wider mb-2">
          {isEditMode ? "EVENT UPDATED" : "EVENT LOGGED"}
        </div>
        {earnedBadges.length > 0 && (
          <div className="mt-4 mb-3">
            <div className="font-display text-sm text-accent tracking-wider uppercase mb-3">
              Badge{earnedBadges.length > 1 ? "s" : ""} Earned!
            </div>
            <div className="flex justify-center gap-3">
              {earnedBadges.map((badge) => (
                <div key={badge.id} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-accent bg-bg-elevated animate-pulse"
                    style={{
                      boxShadow: "0 0 16px rgba(212, 135, 44, 0.5), 0 0 6px rgba(212, 135, 44, 0.3)",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4872C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3 6h6l-4.5 4 1.5 6L12 15l-6 3 1.5-6L3 8h6z" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-text-primary font-medium">{badge.list_name}</span>
                  <span className="text-[10px] text-text-muted">
                    {badge.item_count_at_completion}/{badge.item_count_at_completion}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="text-sm text-text-secondary">
          Redirecting...
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
        {step === 4 && (isEditMode ? "Edit Details" : "Log Details")}
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
          isEditMode={isEditMode}
          initialValues={
            editLog
              ? {
                  rating: editLog.rating,
                  rooting_team_id: editLog.rooting_team_id,
                  is_neutral: editLog.is_neutral,
                  seat_location: editLog.seat_location || "",
                  notes: editLog.notes || "",
                  companions: editLog.companions,
                  privacy: editLog.privacy,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
