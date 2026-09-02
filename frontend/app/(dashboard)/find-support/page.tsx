"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Phone,
  ExternalLink,
  Loader2,
  Building2,
  Star,
  Navigation,
} from "lucide-react";
import { searchSupport } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { ApiError } from "@/lib/api";
import type { SupportResource } from "@/types/chat";

const supportTypes = [
  { value: "", label: "Doctors", query: "doctor" },
  { value: "therapist", label: "Mental Health", query: "therapist" },
  { value: "clinic", label: "Clinics", query: "clinic" },
  { value: "hospital", label: "Hospitals", query: "hospital" },
  { value: "pharmacy", label: "Pharmacies", query: "pharmacy" },
  { value: "dentist", label: "Dentists", query: "dentist" },
  { value: "orthopedic", label: "Orthopedic", query: "orthopedic doctor" },
  { value: "specialist", label: "Specialists", query: "cardiologist" },
  { value: "crisis", label: "Crisis Support", query: "" },
];

function supportLabel(value: string): string {
  switch (value) {
    case "therapist":
      return "therapists";
    case "clinic":
      return "clinics";
    case "hospital":
      return "hospitals";
    case "pharmacy":
      return "pharmacies";
    case "dentist":
      return "dentists";
    case "orthopedic":
      return "orthopedic doctors";
    case "specialist":
      return "specialists";
    case "crisis":
      return "crisis resources";
    default:
      return "healthcare providers";
  }
}

function categoryQuery(value: string): string | undefined {
  return supportTypes.find((st) => st.value === value)?.query;
}

export default function FindSupportPage() {
  const searchParams = useSearchParams();
  const [location, setLocation] = useState("");
  const [supportType, setSupportType] = useState(
    searchParams.get("support_type") || ""
  );
  const [query, setQuery] = useState("");
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!location.trim()) {
      toast("Please enter a location", "error");
      return;
    }
    setLoading(true);
    try {
      const effectiveQuery =
        query.trim() || categoryQuery(supportType) || undefined;
      const res = await searchSupport(
        location,
        supportType || undefined,
        effectiveQuery
      );
      setResources(res.resources);
      setMessage(res.message);
      setSearched(true);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Search failed. Please try again.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          Find Healthcare Near You
        </h1>
        <p className="text-gray-400">
          Search for doctors, clinics, hospitals, pharmacies, and care
          professionals near you.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="p-6 rounded-2xl bg-surface-1 border border-white/5"
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, State or Country"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Category
              </label>
              <select
                value={supportType}
                onChange={(e) => setSupportType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-white/10 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors text-sm"
              >
                {supportTypes.map((st) => (
                  <option key={st.value} value={st.value} className="bg-surface-2">
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              What are you looking for?
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. orthopedic doctor, dentist, physiotherapist"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching near {location}...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Find Healthcare
              </>
            )}
          </button>
        </form>
      </motion.div>

      {searched && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {message && (
            <p className="text-sm text-gray-400 bg-surface-1 border border-white/5 rounded-xl p-4">
              {message}
            </p>
          )}

          {resources.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-1 border border-white/5 text-center">
              <Building2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-2">
                No verified resources found for this location and category.
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Coverage is sourced from OpenStreetMap and Photon. Results
                depend on what is publicly mapped in your area. Try a broader
                search term or a nearby city, or ask in chat instead.
              </p>
              <a
                href="/chat?prompt=I%20need%20to%20find%20healthcare%20near%20me"
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Try in chat
              </a>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {resources.map((resource, i) => (
                <motion.div
                  key={resource.name + i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-2xl bg-surface-1 border border-white/5 hover-lift"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-white">
                      {resource.name}
                    </h3>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-accent-blue/10 text-accent-blue text-[10px] font-medium border border-accent-blue/20">
                        {resource.type}
                      </span>
                      {resource.source && (
                        <span className="px-2 py-0.5 rounded-md bg-surface-3 text-[10px] text-gray-500 border border-white/5">
                          {resource.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 line-clamp-3">
                    {resource.description}
                  </p>
                  {resource.address && (
                    <p className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{resource.address}</span>
                    </p>
                  )}
                  {typeof resource.rating === "number" && (
                    <p className="flex items-center gap-1 text-xs text-amber-400 mb-3">
                      <Star className="w-3 h-3 fill-current" />
                      {resource.rating.toFixed(1)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {resource.phone && (
                      <a
                        href={`tel:${resource.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-3 text-xs text-gray-300 hover:bg-surface-4 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        {resource.phone}
                      </a>
                    )}
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-3 text-xs text-gray-300 hover:bg-surface-4 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Website
                      </a>
                    )}
                    {resource.maps_url && (
                      <a
                        href={resource.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-3 text-xs text-gray-300 hover:bg-surface-4 transition-colors"
                      >
                        <Navigation className="w-3 h-3" />
                        View on Maps
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
