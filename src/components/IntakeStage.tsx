import React, { useState } from 'react';
import { ArrowRight, Compass, RotateCcw } from 'lucide-react';
import { HERITAGE_DATASETS, SAMPLE_PROFILES } from '../data/heritageArchive';
import { HeritageRegionId, UserProfileInput } from '../types/genealogy';
import { calculateAgeFromDob, deriveDobFromAge } from '../utils/lineageEngine';

interface IntakeStageProps {
  initialProfile: UserProfileInput;
  onGenerateTree: (profile: UserProfileInput) => void;
  hasExistingTree: boolean;
  onViewExistingTree: () => void;
}

const ARCHIVAL_ENGRAVING_PATH = '/src/assets/images/archival_lineage_engraving_1795544831945.jpg';

export const IntakeStage: React.FC<IntakeStageProps> = ({
  initialProfile,
  onGenerateTree,
  hasExistingTree,
  onViewExistingTree,
}) => {
  const [form, setForm] = useState<UserProfileInput>(initialProfile);
  const [imageError, setImageError] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleDobChange = (nextDob: string) => {
    const syncedAge = calculateAgeFromDob(nextDob);
    setForm((prev) => ({
      ...prev,
      dob: nextDob,
      age: syncedAge,
    }));
  };

  const handleAgeChange = (rawAge: string) => {
    const parsed = parseInt(rawAge, 10);
    if (isNaN(parsed)) {
      setForm((prev) => ({ ...prev, age: 0 }));
      return;
    }
    const clamped = Math.max(0, Math.min(120, parsed));
    const syncedDob = deriveDobFromAge(clamped, form.dob);
    setForm((prev) => ({
      ...prev,
      age: clamped,
      dob: syncedDob,
    }));
  };

  const handleRegionChange = (regionId: HeritageRegionId) => {
    const dataset = HERITAGE_DATASETS[regionId];
    setForm((prev) => ({
      ...prev,
      regionId,
      birthplace: `${dataset.defaultModernPlace.city}, ${dataset.defaultModernPlace.country}`,
    }));
  };

  const handlePresetClick = (presetProfile: UserProfileInput) => {
    setValidationError(null);
    setForm(presetProfile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setValidationError('Please enter your full name to anchor your family tree.');
      return;
    }
    if (!form.dob) {
      setValidationError('Please provide your date of birth so generational timelines align accurately.');
      return;
    }
    setValidationError(null);
    onGenerateTree(form);
  };

  const selectedDataset = HERITAGE_DATASETS[form.regionId];

  return (
    <main className="max-w-[1360px] mx-auto px-6 py-10 lg:py-12">
      {/* Two-Column Balanced Editorial Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        {/* Left Column: Intake Form */}
        <section className="lg:col-span-7 bg-white border border-[#E4DDD0] rounded-lg p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#6B6257]">
              Personal Lineage Intake
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917] mt-2 leading-tight [text-wrap:balance]">
              Trace your extended family tree and ancestral origins
            </h1>
            <p className="text-sm sm:text-base text-[#57534E] mt-3 leading-relaxed max-w-2xl">
              Enter your name, date of birth, age, and heritage details below to construct an interactive 6-generation pedigree chart, radial fan diagram, and chronological migration map.
            </p>

            {/* Quick Sample Presets */}
            <div className="mt-6 pt-5 border-t border-[#EFE9DD]">
              <div className="flex items-center justify-between gap-4 mb-2.5">
                <span className="text-xs font-medium text-[#6B6257]">
                  Try a curated archival profile
                </span>
                {hasExistingTree && (
                  <button
                    type="button"
                    onClick={onViewExistingTree}
                    className="text-xs font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Return to active tree
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SAMPLE_PROFILES.map((sample) => {
                  const isCurrent =
                    form.fullName === sample.profile.fullName && form.dob === sample.profile.dob;
                  return (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => handlePresetClick(sample.profile)}
                      className={`text-left px-3 py-2.5 rounded-md border transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#F3EFE7] border-[#1E3A8A] text-[#1C1917]'
                          : 'bg-[#FBF9F5] border-[#E4DDD0] text-[#44403C] hover:border-[#B5AA96]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#1C1917] truncate">
                        {sample.label}
                      </div>
                      <div className="text-[11px] text-[#6B6257] truncate mt-0.5">
                        {sample.caption}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {validationError && (
                <div
                  role="alert"
                  className="px-4 py-3 text-xs font-medium text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-md"
                >
                  {validationError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-6">
                  <label
                    htmlFor="full-name"
                    className="block text-xs font-semibold text-[#292524] mb-1.5"
                  >
                    Your Full Name
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="e.g. Clara Vance"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label
                    htmlFor="dob-input"
                    className="block text-xs font-semibold text-[#292524] mb-1.5"
                  >
                    Date of Birth
                  </label>
                  <input
                    id="dob-input"
                    type="date"
                    required
                    value={form.dob}
                    max="2026-11-24"
                    min="1900-01-01"
                    onChange={(e) => handleDobChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="age-input"
                    className="block text-xs font-semibold text-[#292524] mb-1.5"
                  >
                    Age
                  </label>
                  <input
                    id="age-input"
                    type="number"
                    min={0}
                    max={120}
                    value={form.age}
                    onChange={(e) => handleAgeChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="heritage-region"
                    className="block text-xs font-semibold text-[#292524] mb-1.5"
                  >
                    Primary Ancestral Region
                  </label>
                  <select
                    id="heritage-region"
                    value={form.regionId}
                    onChange={(e) => handleRegionChange(e.target.value as HeritageRegionId)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
                  >
                    {Object.values(HERITAGE_DATASETS).map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="birthplace-input"
                    className="block text-xs font-semibold text-[#292524] mb-1.5"
                  >
                    Birthplace (City, Country)
                  </label>
                  <input
                    id="birthplace-input"
                    type="text"
                    value={form.birthplace}
                    onChange={(e) => setForm((p) => ({ ...p, birthplace: e.target.value }))}
                    placeholder="e.g. Edinburgh, Scotland"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Optional Family Anchors */}
              <div className="pt-4 border-t border-[#EFE9DD]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#292524]">
                    Known Family Anchors (Optional)
                  </span>
                  <span className="text-xs text-[#6B6257]">
                    Refines paternal &amp; maternal branches
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-5">
                    <label
                      htmlFor="father-name"
                      className="block text-xs font-medium text-[#57534E] mb-1"
                    >
                      Father&apos;s Name
                    </label>
                    <input
                      id="father-name"
                      type="text"
                      value={form.fatherName}
                      onChange={(e) => setForm((p) => ({ ...p, fatherName: e.target.value }))}
                      placeholder="Auto-matched if blank"
                      className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1E3A8A] focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label
                      htmlFor="mother-name"
                      className="block text-xs font-medium text-[#57534E] mb-1"
                    >
                      Mother&apos;s Maiden Name
                    </label>
                    <input
                      id="mother-name"
                      type="text"
                      value={form.motherName}
                      onChange={(e) => setForm((p) => ({ ...p, motherName: e.target.value }))}
                      placeholder="Auto-matched if blank"
                      className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1E3A8A] focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="siblings-count"
                      className="block text-xs font-medium text-[#57534E] mb-1"
                    >
                      Siblings
                    </label>
                    <select
                      id="siblings-count"
                      value={form.siblingsCount}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, siblingsCount: parseInt(e.target.value, 10) }))
                      }
                      className="w-full px-2.5 py-2 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] focus:outline-none focus:border-[#1E3A8A] focus:bg-white"
                    >
                      {[0, 1, 2, 3, 4].map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2.5 mt-4 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.includeExtendedCousins}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, includeExtendedCousins: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[#D6CEBE] text-[#1E3A8A] focus:ring-[#1E3A8A]"
                  />
                  <span className="text-xs text-[#44403C]">
                    Include aunts, uncles, and first cousins in extended family map
                  </span>
                </label>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      fullName: '',
                      dob: '1995-06-15',
                      age: 31,
                      birthplace: '',
                      regionId: 'british_isles',
                      fatherName: '',
                      motherName: '',
                      siblingsCount: 1,
                      includeExtendedCousins: true,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-[#57534E] bg-[#F6F2EA] border border-[#E4DDD0] rounded-md hover:text-[#1C1917] hover:border-[#D6CEBE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear Fields</span>
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-[#FBF9F5] bg-[#1E3A8A] rounded-md hover:bg-[#172D6B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Build &amp; Trace Family Tree</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Right Column: Archival Cartography Visual & Regional Context */}
        <aside className="lg:col-span-5 flex flex-col justify-between bg-[#F3EFE7] border border-[#E4DDD0] rounded-lg overflow-hidden">
          <div className="relative aspect-[4/3] w-full bg-[#EAE3D5] overflow-hidden border-b border-[#E4DDD0]">
            {!imageError ? (
              <img
                src={ARCHIVAL_ENGRAVING_PATH}
                alt="Antique botanical oak tree and cartographic parchment illustration"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#EAE3D5]">
                <Compass className="w-10 h-10 text-[#854D0E] mb-3" aria-hidden="true" />
                <p className="font-serif text-lg text-[#1C1917]">Archival Pedigree Plate</p>
                <p className="text-xs text-[#6B6257] mt-1">
                  Six-generation lineage &amp; migration cartography
                </p>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
            <div>
              <div className="text-xs text-[#6B6257] font-medium">
                <span>Selected Archive</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>{selectedDataset.label}</span>
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1C1917] mt-1.5">
                {selectedDataset.sublabel}
              </h2>
              <p className="text-sm text-[#44403C] mt-2.5 leading-relaxed">
                {selectedDataset.migrationNarrative}
              </p>

              <dl className="mt-5 pt-4 border-t border-[#E4DDD0] space-y-2.5 text-xs">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[#6B6257]">Primary Record Collections</dt>
                  <dd className="text-[#1C1917] font-medium text-right">
                    {selectedDataset.recordSources.historic[0]}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[#6B6257]">Mapped Origin Centers</dt>
                  <dd className="text-[#1C1917] font-medium text-right">
                    {selectedDataset.ancestralPlaces
                      .slice(0, 3)
                      .map((p) => p.city)
                      .join(' · ')}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[#6B6257]">Synced Birth Cohort</dt>
                  <dd className="font-mono tabular-nums text-[#1C1917] font-medium">
                    {form.dob ? form.dob.slice(0, 4) : '—'} (Age {form.age})
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>

      {/* Full-Width 4-Column Capabilities / Overview Strip Below Split */}
      <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Extended Pedigree Canvas',
            metric: '6 Generations',
            desc: 'Pan, zoom, filter by paternal or maternal branch, and trace direct bloodlines to any ancestor.',
          },
          {
            title: 'Concentric Radial Fan',
            metric: 'Ahnentafel 1–33',
            desc: 'Inspect generational symmetry in 180° half-fan or 360° circle charts colored by origin.',
          },
          {
            title: 'Lifespan Overlap Matrix',
            metric: '1810–2026',
            desc: 'Compare ancestral lifespans against your birth year to see which generations overlapped.',
          },
          {
            title: 'Custom Tree Expansion',
            metric: 'Editable Records',
            desc: 'Add parents, siblings, spouses, or children directly onto any node and save automatically.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white border border-[#E4DDD0] rounded-lg p-5 flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-mono tabular-nums text-[#854D0E] font-medium">
                {item.metric}
              </div>
              <h3 className="font-serif text-base font-semibold text-[#1C1917] mt-1">
                {item.title}
              </h3>
              <p className="text-xs text-[#57534E] mt-1.5 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
};
