import React, { useEffect, useState } from 'react';
import { Check, Edit3, ExternalLink, GitBranch, Globe, Loader2, MapPin, UserPlus, X } from 'lucide-react';
import { GroundedResearchResult, LineagePathResult, PersonNode } from '../types/genealogy';

interface PersonInspectorProps {
  person: PersonNode | null;
  rootId: string;
  lineagePath: LineagePathResult | null;
  onSelectPerson: (id: string) => void;
  onUpdatePerson: (updated: PersonNode) => void;
  onOpenAddRelativeFor: (anchorId: string) => void;
  onCompareInKinshipLab?: (personId: string) => void;
  onClose?: () => void;
}

const REFERENCE_YEAR = 2026;

export const PersonInspector: React.FC<PersonInspectorProps> = ({
  person,
  rootId,
  lineagePath,
  onSelectPerson,
  onUpdatePerson,
  onOpenAddRelativeFor,
  onCompareInKinshipLab,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftFirst, setDraftFirst] = useState('');
  const [draftLast, setDraftLast] = useState('');
  const [draftBirthYear, setDraftBirthYear] = useState(1980);
  const [draftDeathYear, setDraftDeathYear] = useState<string>('');
  const [draftPlace, setDraftPlace] = useState('');
  const [draftOccupation, setDraftOccupation] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [researchResult, setResearchResult] = useState<GroundedResearchResult | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  useEffect(() => {
    setIsEditing(false);
    setResearchResult(null);
    setResearchError(null);
    if (person) {
      setDraftFirst(person.firstName);
      setDraftLast(person.lastName);
      setDraftBirthYear(person.birthYear);
      setDraftDeathYear(person.deathYear ? String(person.deathYear) : '');
      setDraftPlace(person.birthplace);
      setDraftOccupation(person.occupation);
      setDraftBio(person.bioNote);
    }
  }, [person]);

  const handleFetchHistoricalContext = async () => {
    if (!person) return;
    setResearchLoading(true);
    setResearchError(null);
    try {
      const res = await fetch('/api/research/historical-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: `${person.firstName} ${person.lastName}`,
          surname: person.lastName,
          birthplace: person.birthplace,
          birthYear: person.birthYear,
          occupation: person.occupation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to retrieve historical search context.');
      }
      setResearchResult({
        summary: data.summary || '',
        sources: Array.isArray(data.sources) ? data.sources : [],
      });
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : 'Research request failed.');
    } finally {
      setResearchLoading(false);
    }
  };

  if (!person) {
    return (
      <aside className="bg-white border border-[#E4DDD0] rounded-lg p-6 text-center">
        <p className="font-serif text-base font-medium text-[#1C1917]">Archival Dossier</p>
        <p className="text-xs text-[#6B6257] mt-1.5 leading-relaxed">
          Select any person on the pedigree tree, fan chart, or timeline to inspect their biographical record and trace their lineage path back to you.
        </p>
      </aside>
    );
  }

  const lifespanYears = person.deathYear
    ? person.deathYear - person.birthYear
    : REFERENCE_YEAR - person.birthYear;

  const branchLabel =
    person.branch === 'paternal'
      ? 'Paternal Line'
      : person.branch === 'maternal'
      ? 'Maternal Line'
      : person.branch === 'self'
      ? 'Focal Root'
      : 'Extended Kin';

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDeath = draftDeathYear.trim() ? parseInt(draftDeathYear, 10) : null;
    const validDeath = parsedDeath && !isNaN(parsedDeath) ? parsedDeath : null;
    onUpdatePerson({
      ...person,
      firstName: draftFirst.trim() || person.firstName,
      lastName: draftLast.trim() || person.lastName,
      birthYear: draftBirthYear || person.birthYear,
      birthDate: `${draftBirthYear || person.birthYear}${person.birthDate.slice(4) || '-01-01'}`,
      deathYear: validDeath,
      isLiving: validDeath === null,
      birthplace: draftPlace.trim() || person.birthplace,
      occupation: draftOccupation.trim() || person.occupation,
      bioNote: draftBio.trim() || person.bioNote,
    });
    setIsEditing(false);
  };

  return (
    <aside className="bg-white border border-[#E4DDD0] rounded-lg flex flex-col overflow-hidden">
      {/* Top Dossier Header */}
      <div className="px-5 py-4 bg-[#F6F2EA] border-b border-[#E4DDD0] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-[#6B6257] flex flex-wrap items-center gap-1.5">
            <span>{person.relationshipLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{branchLabel}</span>
            {person.ahnentafel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Ref #{person.ahnentafel}</span>
              </>
            )}
          </div>
          <h2 className="font-serif text-xl font-semibold text-[#1C1917] mt-1 truncate">
            {person.firstName} {person.lastName}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            title="Edit record"
            aria-label="Edit record"
            className="p-2 rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE3D5] transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4" aria-hidden="true" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close dossier"
              aria-label="Close dossier"
              className="p-2 rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE3D5] transition-colors cursor-pointer lg:hidden"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">First Name</label>
                <input
                  type="text"
                  value={draftFirst}
                  onChange={(e) => setDraftFirst(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">Surname</label>
                <input
                  type="text"
                  value={draftLast}
                  onChange={(e) => setDraftLast(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">Birth Year</label>
                <input
                  type="number"
                  value={draftBirthYear}
                  onChange={(e) => setDraftBirthYear(parseInt(e.target.value, 10) || 1900)}
                  className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-[#D6CEBE] rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Death Year (blank if living)
                </label>
                <input
                  type="number"
                  value={draftDeathYear}
                  placeholder="Living"
                  onChange={(e) => setDraftDeathYear(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-[#D6CEBE] rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#57534E] mb-1">Birthplace</label>
              <input
                type="text"
                value={draftPlace}
                onChange={(e) => setDraftPlace(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#57534E] mb-1">Occupation</label>
              <input
                type="text"
                value={draftOccupation}
                onChange={(e) => setDraftOccupation(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#57534E] mb-1">Archival Note</label>
              <textarea
                rows={3}
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FBF9F5] border border-[#D6CEBE] rounded"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#57534E] bg-[#F3EFE7] rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] rounded cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Save Record</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Accession Metadata Grid */}
            <dl className="divide-y divide-[#EFE9DD] text-xs">
              <div className="py-2 flex items-baseline justify-between gap-4">
                <dt className="text-[#6B6257]">Life Span</dt>
                <dd className="font-mono tabular-nums text-[#1C1917] font-medium text-right">
                  {person.birthYear} – {person.deathYear ?? 'Present'} ({lifespanYears} yrs)
                </dd>
              </div>
              <div className="py-2 flex items-baseline justify-between gap-4">
                <dt className="text-[#6B6257]">Birth Date</dt>
                <dd className="font-mono tabular-nums text-[#1C1917] text-right">
                  {person.birthDate}
                </dd>
              </div>
              <div className="py-2 flex items-baseline justify-between gap-4">
                <dt className="text-[#6B6257]">Origin Place</dt>
                <dd className="text-[#1C1917] font-medium text-right inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#854D0E] shrink-0" aria-hidden="true" />
                  <span>{person.birthplace}</span>
                </dd>
              </div>
              <div className="py-2 flex items-baseline justify-between gap-4">
                <dt className="text-[#6B6257]">Vocation</dt>
                <dd className="text-[#1C1917] text-right">{person.occupation}</dd>
              </div>
              <div className="py-2 flex items-baseline justify-between gap-4">
                <dt className="text-[#6B6257]">Archive Source</dt>
                <dd className="text-[#44403C] text-right max-w-[60%]">{person.archivalCitation}</dd>
              </div>
            </dl>

            {/* Biographical Note */}
            <div className="pt-3 border-t border-[#EFE9DD]">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6257]">
                Lineage Record Note
              </h3>
              <p className="text-xs text-[#44403C] mt-1.5 leading-relaxed">{person.bioNote}</p>
            </div>

            {/* Google Search Grounded Historical & Archival Research */}
            <div className="pt-3 border-t border-[#EFE9DD] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6257] inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#14532D]" aria-hidden="true" />
                  <span>Verified Historical Context</span>
                </h3>
                <button
                  type="button"
                  disabled={researchLoading}
                  onClick={handleFetchHistoricalContext}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#14532D] bg-[#F0F7F2] border border-[#C5DEC9] rounded hover:bg-[#E2EFE6] transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {researchLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <span>{researchResult ? 'Refresh Search' : 'Search Archives'}</span>
                  )}
                </button>
              </div>

              {researchError && (
                <div className="text-[11px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded px-3 py-2">
                  {researchError}
                </div>
              )}

              {researchResult && (
                <div className="bg-[#FBF9F5] border border-[#E4DDD0] rounded-md p-3 space-y-2.5">
                  <div className="text-xs text-[#292524] leading-relaxed whitespace-pre-line">
                    {researchResult.summary}
                  </div>
                  {researchResult.sources.length > 0 && (
                    <div className="pt-2 border-t border-[#EFE9DD]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6257] mb-1.5">
                        Grounded Sources
                      </div>
                      <ul className="space-y-1">
                        {researchResult.sources.slice(0, 5).map((src) => (
                          <li key={src.uri}>
                            <a
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[#1E3A8A] hover:underline max-w-full truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                              <span className="truncate">{src.title}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Traced Lineage Path back to You */}
            {lineagePath && person.id !== rootId && (
              <div className="pt-3 border-t border-[#EFE9DD]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6257] inline-flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-[#1E3A8A]" aria-hidden="true" />
                    <span>Traced Path From You</span>
                  </h3>
                  <span className="font-mono tabular-nums text-[11px] font-medium text-[#1E3A8A]">
                    ~{lineagePath.estimatedSharedLineagePct}% shared lineage
                  </span>
                </div>

                <ol className="space-y-1.5">
                  {lineagePath.steps.map((step, index) => {
                    const isLast = index === lineagePath.steps.length - 1;
                    return (
                      <li key={step.node.id} className="flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => onSelectPerson(step.node.id)}
                          className={`text-left truncate hover:underline cursor-pointer ${
                            isLast ? 'font-semibold text-[#1E3A8A]' : 'text-[#292524]'
                          }`}
                        >
                          {index + 1}. {step.node.firstName} {step.node.lastName}
                        </button>
                        <span className="text-[11px] text-[#6B6257] shrink-0">
                          {step.relationFromPrev}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-3 border-t border-[#EFE9DD] flex flex-col gap-2">
              {onCompareInKinshipLab && person.id !== rootId && (
                <button
                  type="button"
                  onClick={() => onCompareInKinshipLab(person.id)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#1C1917] bg-white border border-[#D6CEBE] rounded-md hover:bg-[#F3EFE7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <GitBranch className="w-3.5 h-3.5 text-[#854D0E]" aria-hidden="true" />
                  <span>Calculate Exact Kinship</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenAddRelativeFor(person.id)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#1E3A8A] bg-[#F3EFE7] border border-[#D6CEBE] rounded-md hover:bg-[#EAE3D5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add Relative to {person.firstName}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
