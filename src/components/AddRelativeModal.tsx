import React, { useState } from 'react';
import { X } from 'lucide-react';
import { NewRelativeInput, PersonNode } from '../types/genealogy';

interface AddRelativeModalProps {
  isOpen: boolean;
  anchorPerson: PersonNode;
  allNodes: PersonNode[];
  onClose: () => void;
  onAddRelative: (input: NewRelativeInput) => void;
}

export const AddRelativeModal: React.FC<AddRelativeModalProps> = ({
  isOpen,
  anchorPerson,
  allNodes,
  onClose,
  onAddRelative,
}) => {
  const [anchorId, setAnchorId] = useState(anchorPerson.id);
  const [relationType, setRelationType] = useState<'parent' | 'sibling' | 'child' | 'spouse'>('child');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(anchorPerson.lastName);
  const [gender, setGender] = useState<'female' | 'male' | 'other'>('female');
  const [birthYear, setBirthYear] = useState(anchorPerson.birthYear + 26);
  const [deathYear, setDeathYear] = useState('');
  const [birthplace, setBirthplace] = useState(anchorPerson.birthplace);
  const [occupation, setOccupation] = useState('');
  const [bioNote, setBioNote] = useState('');

  if (!isOpen) return null;

  const selectedAnchor = allNodes.find((n) => n.id === anchorId) || anchorPerson;

  const handleRelationChange = (rel: 'parent' | 'sibling' | 'child' | 'spouse') => {
    setRelationType(rel);
    if (rel === 'parent') setBirthYear(selectedAnchor.birthYear - 28);
    else if (rel === 'child') setBirthYear(Math.min(2025, selectedAnchor.birthYear + 28));
    else setBirthYear(selectedAnchor.birthYear + 2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    const parsedDeath = deathYear.trim() ? parseInt(deathYear, 10) : null;
    onAddRelative({
      anchorId: selectedAnchor.id,
      relationType,
      firstName: firstName.trim(),
      lastName: lastName.trim() || selectedAnchor.lastName,
      gender,
      birthYear: birthYear || 1980,
      deathYear: parsedDeath && !isNaN(parsedDeath) ? parsedDeath : null,
      birthplace: birthplace.trim() || selectedAnchor.birthplace,
      occupation: occupation.trim() || 'Family Member',
      bioNote:
        bioNote.trim() ||
        `Added to the ${selectedAnchor.lastName} family record connected via ${selectedAnchor.firstName}.`,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1C1917]/40 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-relative-title"
    >
      <div className="bg-white border border-[#D6CEBE] rounded-lg w-full max-w-lg overflow-hidden shadow-lg">
        <div className="px-6 py-4 bg-[#F6F2EA] border-b border-[#E4DDD0] flex items-center justify-between gap-4">
          <div>
            <h2 id="add-relative-title" className="font-serif text-lg font-semibold text-[#1C1917]">
              Add Family Member
            </h2>
            <p className="text-xs text-[#6B6257] mt-0.5">
              Expand your extended tree with a custom biographical record
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE3D5] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#292524] mb-1">
                Connect To
              </label>
              <select
                value={anchorId}
                onChange={(e) => setAnchorId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md"
              >
                {allNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.firstName} {n.lastName} ({n.relationshipLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292524] mb-1">
                Relationship Type
              </label>
              <select
                value={relationType}
                onChange={(e) =>
                  handleRelationChange(e.target.value as 'parent' | 'sibling' | 'child' | 'spouse')
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md"
              >
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="spouse">Spouse / Partner</option>
                <option value="child">Child</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#292524] mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Julian"
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292524] mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292524] mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'female' | 'male' | 'other')}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#292524] mb-1">
                Birth Year
              </label>
              <input
                type="number"
                required
                min={1700}
                max={2026}
                value={birthYear}
                onChange={(e) => setBirthYear(parseInt(e.target.value, 10) || 1980)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-[#D6CEBE] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292524] mb-1">
                Death Year (Optional)
              </label>
              <input
                type="number"
                min={1700}
                max={2026}
                placeholder="Living"
                value={deathYear}
                onChange={(e) => setDeathYear(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-[#D6CEBE] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292524] mb-1">
                Occupation
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Architect"
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292524] mb-1">
              Birthplace
            </label>
            <input
              type="text"
              value={birthplace}
              onChange={(e) => setBirthplace(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292524] mb-1">
              Biographical Note
            </label>
            <textarea
              rows={2}
              value={bioNote}
              onChange={(e) => setBioNote(e.target.value)}
              placeholder="Historical context, migration story, or archival record..."
              className="w-full px-3 py-2 text-xs bg-[#FBF9F5] border border-[#D6CEBE] rounded-md"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#57534E] bg-[#F3EFE7] border border-[#E4DDD0] rounded-md hover:bg-[#EAE3D5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-[#FBF9F5] bg-[#1E3A8A] rounded-md hover:bg-[#172D6B] cursor-pointer"
            >
              Add to Tree
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
