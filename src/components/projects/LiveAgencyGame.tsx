"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, Building2, Footprints, Handshake, Pause, Play, ScanEye } from "lucide-react";
import {
  DWD_WORKFORCE_AGENTS,
  DWD_WORKFORCE_DEPARTMENTS,
} from "@/lib/workforce-agents";

const ROOM_CENTERS = DWD_WORKFORCE_DEPARTMENTS.map((_, index) => ({
  x: 10 + (index % 5) * 20,
  y: index < 5 ? 46 : 72,
}));
const AGENT_OFFSETS = [
  [-9, -6],
  [-4.5, -6],
  [0, -5.5],
  [4.5, -6],
  [9, -6],
  [-9, 6],
  [-4.5, 6],
  [0, 6],
  [4.5, 6],
  [9, 6],
];
const TRANSIT_DURATION_MS = 3400;

const HOME_ROOM_BY_AGENT = DWD_WORKFORCE_AGENTS.map((agent) =>
  DWD_WORKFORCE_DEPARTMENTS.findIndex((department) =>
    department.agentRoles.includes(agent.role),
  ),
);

function getAgentPoint(agentIndex: number, roomIndex: number) {
  const room = ROOM_CENTERS[roomIndex];
  const [offsetX, offsetY] = AGENT_OFFSETS[agentIndex % AGENT_OFFSETS.length];
  return { x: room.x + offsetX, y: room.y + offsetY };
}

interface AgentJourney {
  agentIndex: number;
  fromRoom: number;
  toRoom: number;
  receiverIndex: number;
  phase: "walking" | "handoff" | "returning";
}

interface Handoff {
  senderIndex: number;
  receiverIndex: number;
  departmentIndex: number;
}

export default function LiveAgencyGame() {
  const [journeys, setJourneys] = useState<AgentJourney[]>([]);
  const [lastHandoff, setLastHandoff] = useState<Handoff | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const departmentAgentIndices = useMemo(
    () =>
      DWD_WORKFORCE_DEPARTMENTS.map((department) =>
        DWD_WORKFORCE_AGENTS.flatMap((agent, index) =>
          department.agentRoles.includes(agent.role) ? [index] : [],
        ),
      ),
    [],
  );

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    let agentCursor = 0;
    const timers: number[] = [];
    const busyAgents = new Set<number>();
    let cancelled = false;

    const beginWalk = () => {
      if (cancelled) return;

      let agentIndex = agentCursor % DWD_WORKFORCE_AGENTS.length;
      let attempts = 0;
      while (busyAgents.has(agentIndex) && attempts < DWD_WORKFORCE_AGENTS.length) {
        agentIndex = (agentIndex + 1) % DWD_WORKFORCE_AGENTS.length;
        attempts += 1;
      }
      if (attempts === DWD_WORKFORCE_AGENTS.length) {
        timers.push(window.setTimeout(beginWalk, 500));
        return;
      }

      const fromRoom = HOME_ROOM_BY_AGENT[agentIndex];
      const destinationRooms = Array.from(
        { length: DWD_WORKFORCE_DEPARTMENTS.length - 1 },
        (_, index) => (fromRoom + 1 + ((agentCursor + index) % (DWD_WORKFORCE_DEPARTMENTS.length - 1))) % DWD_WORKFORCE_DEPARTMENTS.length,
      );
      const destination = destinationRooms
        .map((room) => ({
          room,
          receivers: departmentAgentIndices[room].filter(
            (index) => index !== agentIndex && !busyAgents.has(index),
          ),
        }))
        .find((candidate) => candidate.receivers.length > 0);
      if (!destination) {
        agentCursor += 1;
        timers.push(window.setTimeout(beginWalk, 500));
        return;
      }
      const { room: toRoom, receivers } = destination;
      const receiverIndex = receivers[agentCursor % receivers.length];
      const nextJourney: AgentJourney = {
        agentIndex,
        fromRoom,
        toRoom,
        receiverIndex,
        phase: "walking",
      };
      busyAgents.add(agentIndex);
      busyAgents.add(receiverIndex);
      agentCursor += 1;
      setJourneys((current) => [...current, nextJourney]);
      const arrivalTimer = window.setTimeout(() => {
        if (cancelled) return;

        setLastHandoff({
          senderIndex: agentIndex,
          receiverIndex,
          departmentIndex: toRoom,
        });
        setJourneys((current) =>
          current.map((item) =>
            item.agentIndex === agentIndex ? { ...item, phase: "handoff" } : item,
          ),
        );
        const returnTimer = window.setTimeout(() => {
          if (cancelled) return;
          setJourneys((current) =>
            current.map((item) =>
              item.agentIndex === agentIndex
                ? { ...item, fromRoom: toRoom, toRoom: fromRoom, phase: "returning" }
                : item,
            ),
          );
          const settleTimer = window.setTimeout(() => {
            if (cancelled) return;
            busyAgents.delete(agentIndex);
            busyAgents.delete(receiverIndex);
            setJourneys((current) =>
              current.filter((item) => item.agentIndex !== agentIndex),
            );
          }, TRANSIT_DURATION_MS);
          timers.push(settleTimer);
        }, 1100);
        timers.push(returnTimer);
      }, TRANSIT_DURATION_MS);
      timers.push(arrivalTimer);
      const nextWalkTimer = window.setTimeout(beginWalk, 1800);
      timers.push(nextWalkTimer);
    };

    const startTimer = window.setTimeout(beginWalk, 900);
    timers.push(startTimer);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [departmentAgentIndices, isPlaying]);

  const followedJourney =
    (selectedAgent === null
      ? journeys[0]
      : journeys.find((item) => item.agentIndex === selectedAgent)) ?? null;
  const followedAgent = selectedAgent ?? followedJourney?.agentIndex ?? null;
  const followedAgentData =
    followedAgent === null ? null : DWD_WORKFORCE_AGENTS[followedAgent];
  const currentRoom =
    followedAgent === null
      ? null
      : followedJourney?.agentIndex === followedAgent
        ? followedJourney.toRoom
        : HOME_ROOM_BY_AGENT[followedAgent];
  const displayedRoomByAgent = HOME_ROOM_BY_AGENT.map((room, index) =>
    journeys.find((item) => item.agentIndex === index)?.toRoom ?? room,
  );
  const toggleSimulation = () => {
    if (isPlaying) {
      setJourneys([]);
      setLastHandoff(null);
    }
    setIsPlaying((current) => !current);
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#101216] text-white shadow-2xl">
      <header className="flex flex-col justify-between gap-3 border-b border-white/10 bg-[#171a20] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e31e36]/30 bg-[#e31e36]/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-rose-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e31e36]" />
              Live office simulation
            </span>
            <span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-200">
              Illustrative · not connected AI workers
            </span>
          </div>
          <h2 className="mt-2 text-lg font-black tracking-tight sm:text-xl">
            Follow the work around Agency City
          </h2>
          <p className="mt-1 text-[10px] text-gray-400">
            Click an agent to follow them. Watch specialists travel, meet a teammate and hand off work.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[9px] font-bold text-gray-300">
            {isPlaying ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-slate-500" />
            )}
            {isPlaying
              ? `${DWD_WORKFORCE_AGENTS.length} roles · ${journeys.length} moving`
              : "Simulation paused"}
          </span>
          <button
            type="button"
            onClick={toggleSimulation}
            aria-label={isPlaying ? "Pause office simulation" : "Resume office simulation"}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#e31e36] px-3 py-2 text-[9px] font-extrabold text-white transition hover:bg-[#c8162d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isPlaying ? "Pause" : "Resume"}
          </button>
        </div>
      </header>

      <div className="overflow-x-auto overscroll-x-contain bg-[#171a20]">
        <div
          className="relative mx-auto aspect-[3/2] min-w-[880px] overflow-hidden bg-[#202a35] bg-cover bg-center sm:min-w-0"
          style={{ backgroundImage: "url('/agency/scenes/dwd-future-office.webp')" }}
          aria-label="Illustrated Durrani Web Developers office with fifty selectable agents"
          role="group"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d1018]/20 via-transparent to-[#080a0e]/40" />

          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M10 46 H90 M10 72 H90 M10 46 V72 M30 46 V72 M50 46 V72 M70 46 V72 M90 46 V72"
              fill="none"
              stroke="rgba(255,255,255,.45)"
              strokeWidth=".4"
              strokeDasharray="1 1.8"
            />
            {journeys.map((journey) => {
              const fromRoom = ROOM_CENTERS[journey.fromRoom];
              const toRoom = ROOM_CENTERS[journey.toRoom];
              const path = `M${fromRoom.x} ${fromRoom.y} L${fromRoom.x} 59 L${toRoom.x} 59 L${toRoom.x} ${toRoom.y}`;
              return (
              <g key={journey.agentIndex}>
                <path
                  d={path}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="1.3 1.4"
                  opacity=".75"
                />
                <path
                  d={path}
                  fill="none"
                  stroke="#f02a45"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeDasharray="1.3 1.4"
                />
              </g>
              );
            })}
          </svg>

          {DWD_WORKFORCE_DEPARTMENTS.map((department, index) => (
            <div
              key={department.name}
              className={`absolute z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-1 text-[7px] font-black uppercase tracking-wide shadow-lg sm:px-2 sm:text-[8px] ${
                journeys.some((item) => item.toRoom === index)
                  ? "border-emerald-200 bg-emerald-500 text-white"
                  : "border-white/60 bg-[#101820]/90 text-white"
              }`}
              style={{
                left: `${ROOM_CENTERS[index].x}%`,
                top: `${ROOM_CENTERS[index].y - 7}%`,
              }}
            >
              <Building2 className="h-2.5 w-2.5 shrink-0" />
              {department.name}
            </div>
          ))}

          {DWD_WORKFORCE_AGENTS.map((agent, index) => {
            const agentJourney =
              journeys.find((item) => item.agentIndex === index) ?? null;
            const roomIndex = agentJourney
              ? agentJourney.phase === "returning"
                ? HOME_ROOM_BY_AGENT[index]
                : agentJourney.toRoom
              : HOME_ROOM_BY_AGENT[index];
            const slotIndex = displayedRoomByAgent
              .slice(0, index)
              .filter((room) => room === displayedRoomByAgent[index]).length;
            const point = getAgentPoint(slotIndex, roomIndex);
            const isSelected = selectedAgent === index;
            const isWalking = agentJourney !== null;
            const isHandoff = agentJourney?.phase === "handoff";
            const meetingJourney = journeys.find(
              (item) => item.phase === "handoff" && item.receiverIndex === index,
            );
            const isReceivingHandoff = Boolean(meetingJourney);
            const shouldShowName =
              isSelected ||
              (selectedAgent === null && isWalking) ||
              isReceivingHandoff;

            return (
              <button
                key={agent.avatar}
                type="button"
                onClick={() => setSelectedAgent((current) => current === index ? null : index)}
                title={agent.role}
                aria-label={`${agent.role}${isReceivingHandoff && meetingJourney ? `, receiving work from ${DWD_WORKFORCE_AGENTS[meetingJourney.agentIndex].role}` : isWalking ? `, walking to ${DWD_WORKFORCE_DEPARTMENTS[agentJourney.toRoom].name}` : `, at ${DWD_WORKFORCE_DEPARTMENTS[roomIndex].name}`}`}
                aria-pressed={isSelected}
                className={`absolute z-20 flex min-h-11 min-w-9 touch-manipulation -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg p-[2px] cursor-pointer transition-[left,top] focus-visible:z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  isWalking || isReceivingHandoff ? "z-30 scale-110" : ""
                } ${isWalking ? "motion-safe:animate-bounce [animation-duration:0.8s]" : ""} ${isSelected ? "z-40 scale-125" : ""}`}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  transitionDuration: `${TRANSIT_DURATION_MS}ms`,
                  transitionTimingFunction: "cubic-bezier(.25,.65,.35,1)",
                }}
              >
                {shouldShowName && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-40 -translate-x-1/2 rounded-md border border-white/40 bg-[#101216] px-2 py-1.5 text-[8px] font-extrabold text-white shadow-[0_4px_18px_rgba(0,0,0,.85)] ring-1 ring-black/70">
                    {agent.role}
                    {isReceivingHandoff && meetingJourney
                      ? <span className="block font-medium text-amber-200">Collecting work from {DWD_WORKFORCE_AGENTS[meetingJourney.agentIndex].role}</span>
                      : isHandoff
                        ? <span className="block font-medium text-amber-200">Handing work to {DWD_WORKFORCE_AGENTS[agentJourney.receiverIndex].role}</span>
                      : isWalking && <span className="block font-medium text-emerald-200">{agentJourney.phase === "returning" ? "Returning to" : "Walking to"} {DWD_WORKFORCE_DEPARTMENTS[agentJourney.toRoom].name}</span>}
                  </span>
                )}
                <span
                  className={`relative block h-10 w-8 overflow-hidden rounded-md border-2 bg-[#101216] shadow-[0_2px_10px_rgba(0,0,0,.75)] sm:h-12 sm:w-9 ${
                    isHandoff || isReceivingHandoff
                      ? "border-amber-200 shadow-[0_0_18px_rgba(251,191,36,.8)]"
                      : isWalking
                      ? "border-emerald-300 shadow-[0_0_16px_rgba(52,211,153,.8)]"
                      : isSelected
                        ? "border-white shadow-[0_0_18px_rgba(255,255,255,.7)]"
                        : "border-white/80"
                  }`}
                >
                  <Image
                    src={`/agency/avatars/${agent.avatar}.webp`}
                    alt=""
                    aria-hidden="true"
                    fill
                    unoptimized
                    sizes="40px"
                    className="object-cover object-top"
                  />
                </span>
                <span
                  className={`mt-0.5 max-w-16 truncate rounded bg-black/85 px-1 text-[6px] font-black text-white sm:text-[7px] ${
                    isSelected || isWalking || isReceivingHandoff ? "block" : "hidden"
                  }`}
                >
                  {agent.role}
                </span>
              </button>
            );
          })}

          {journeys.filter((item) => item.phase !== "returning").map((journey) => (
            <div
              key={journey.agentIndex}
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 p-1.5 text-white shadow-lg"
              style={{
                left: `${ROOM_CENTERS[journey.toRoom].x}%`,
                top: `${ROOM_CENTERS[journey.toRoom].y + 1}%`,
              }}
              aria-label={`${DWD_WORKFORCE_AGENTS[journey.receiverIndex].role} meeting ${DWD_WORKFORCE_AGENTS[journey.agentIndex].role}`}
            >
              <Handshake className={`h-3 w-3 ${journey.phase === "handoff" ? "animate-pulse" : ""}`} />
            </div>
          ))}

          <div className="absolute left-3 top-3 z-40 flex items-center gap-1.5 rounded-lg border border-white/20 bg-[#101216]/85 px-2.5 py-2 text-[8px] font-bold uppercase tracking-wider text-white shadow-lg sm:left-4 sm:top-4 sm:text-[9px]">
            <Footprints className="h-3 w-3 text-emerald-300" />
            {journeys.length > 0 ? "Team moving between departments" : "Agency floor"}
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-40 flex flex-col justify-between gap-2 rounded-xl border border-white/15 bg-[#101216]/95 p-2.5 shadow-2xl sm:bottom-4 sm:left-4 sm:right-4 sm:flex-row sm:items-center sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-2">
              {followedAgentData ? (
                <>
                  <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded-md border border-white/30">
                    <Image
                      src={`/agency/avatars/${followedAgentData.avatar}.webp`}
                      alt=""
                      fill
                      unoptimized
                      sizes="32px"
                      className="object-cover object-top"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-black text-white">
                      {followedAgentData.role}
                      {followedJourney?.phase === "handoff"
                        ? " · handing off work"
                        : followedJourney
                          ? followedJourney.phase === "returning" ? " · heading back" : " · walking"
                          : " · at desk"}
                    </p>
                    <p className="truncate text-[8px] text-gray-300">
                      {followedJourney
                        ? followedJourney.phase === "handoff"
                          ? `Handing work to ${DWD_WORKFORCE_AGENTS[followedJourney.receiverIndex].role} in ${DWD_WORKFORCE_DEPARTMENTS[followedJourney.toRoom].name}`
                          : `${followedJourney.phase === "returning" ? "Returning to" : "Heading to"} ${DWD_WORKFORCE_DEPARTMENTS[followedJourney.toRoom].name} · route highlighted on map`
                        : `Currently in ${currentRoom === null ? "the office" : DWD_WORKFORCE_DEPARTMENTS[currentRoom].name} · ${followedAgentData.task}`}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-[9px] font-black text-white">Select any agent to follow them</p>
                  <p className="text-[8px] text-gray-400">A new teammate walks across campus and hands off work every few seconds.</p>
                </div>
              )}
            </div>

            <div
              className="flex shrink-0 items-center gap-1.5 text-[8px] font-bold text-emerald-200"
              aria-live="polite"
            >
              {followedJourney ? (
                followedJourney.phase === "handoff"
                  ? <><Handshake className="h-3.5 w-3.5" /> Work handoff</>
                  : <><ArrowDownRight className="h-3.5 w-3.5" /> Following agent movement</>
              ) : lastHandoff ? (
                <><Handshake className="h-3.5 w-3.5" /> Last handoff completed</>
              ) : (
                <><ScanEye className="h-3.5 w-3.5" /> Click a portrait to inspect</>
              )}
            </div>
          </div>
        </div>
      </div>

      {lastHandoff && (
        <p className="border-t border-white/10 bg-[#171a20] px-5 py-2 text-center text-[8px] text-gray-400 sm:text-left">
          Simulation: {DWD_WORKFORCE_AGENTS[lastHandoff.senderIndex].role} delivered a task to{" "}
          {DWD_WORKFORCE_AGENTS[lastHandoff.receiverIndex].role} in{" "}
          {DWD_WORKFORCE_DEPARTMENTS[lastHandoff.departmentIndex].name}.
        </p>
      )}
      <p className="border-t border-white/10 bg-[#171a20] px-5 py-2 text-[8px] leading-relaxed text-gray-500 sm:px-7">
        This is a visual simulation for the agency showcase. Agent travel, meetings and handoffs are animated demo events; they are not real work activity or a live connection to autonomous workers.
      </p>
    </section>
  );
}
