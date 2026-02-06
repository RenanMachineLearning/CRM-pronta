/**
 * Componente para seleção múltipla de tags
 * Exibe tags como chips selecionáveis
 */

import type { Tag } from '../types/tag';

export interface TagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  error?: string;
}

export function TagSelector({ tags, selectedTagIds, onChange, error }: TagSelectorProps) {
  const handleToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const labelId = 'tag-selector-label';

  return (
    <div className="mb-4">
      <label id={labelId} className="block text-sm font-medium text-gray-700 mb-2">
        Tags
      </label>
      <div 
        className="flex flex-wrap gap-2"
        role="group"
        aria-labelledby={labelId}
      >
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleToggle(tag.id)}
              aria-pressed={isSelected}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                  : 'bg-gray-100 text-gray-700 border-2 border-transparent'
              }`}
              style={isSelected ? { borderColor: tag.color } : {}}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

