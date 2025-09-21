import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

const colorOptions = [
  { value: "border-red-500", bgClass: "bg-red-500", label: "Red" },
  { value: "border-blue-500", bgClass: "bg-blue-500", label: "Blue" },
  { value: "border-green-500", bgClass: "bg-green-500", label: "Green" },
  { value: "border-yellow-500", bgClass: "bg-yellow-500", label: "Yellow" },
  { value: "border-purple-500", bgClass: "bg-purple-500", label: "Purple" },
  { value: "border-pink-500", bgClass: "bg-pink-500", label: "Pink" },
  { value: "border-orange-500", bgClass: "bg-orange-500", label: "Orange" },
  { value: "border-indigo-500", bgClass: "bg-indigo-500", label: "Indigo" },
  { value: "border-teal-500", bgClass: "bg-teal-500", label: "Teal" },
  { value: "border-cyan-500", bgClass: "bg-cyan-500", label: "Cyan" },
  { value: "border-lime-500", bgClass: "bg-lime-500", label: "Lime" },
  { value: "border-emerald-500", bgClass: "bg-emerald-500", label: "Emerald" },
  { value: "border-sky-500", bgClass: "bg-sky-500", label: "Sky Blue" },
  { value: "border-violet-500", bgClass: "bg-violet-500", label: "Violet" },
  { value: "border-rose-500", bgClass: "bg-rose-500", label: "Rose" },
  { value: "border-amber-500", bgClass: "bg-amber-500", label: "Amber" },
  { value: "border-black", bgClass: "bg-black", label: "Black" },
  { value: "border-gray-600", bgClass: "bg-gray-600", label: "Gray" },
  {
    value: "border-white",
    bgClass: "bg-white border border-gray-300",
    label: "White",
  },
  { value: "border-slate-600", bgClass: "bg-slate-600", label: "Slate" },
];

export default function ColorDropdown({ selectedColor, onColorChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Helper function to get the background class for a color value
  const getSelectedColorBgClass = (colorValue) => {
    const color = colorOptions.find((c) => c.value === colorValue);
    return color ? color.bgClass : "";
  };

  // Helper function to get the label for a color value
  const getSelectedColorLabel = (colorValue) => {
    const color = colorOptions.find((c) => c.value === colorValue);
    return color ? color.label : "";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleColorSelect = (colorValue) => {
    onColorChange(colorValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border rounded bg-white hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between border-slate-400"
      >
        <div className="flex items-center">
          <div
            className={`w-6 h-6 rounded-full mr-3 border ${getSelectedColorBgClass(
              selectedColor
            )}`}
          />
          <span>{getSelectedColorLabel(selectedColor)}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute w-[150%] top-full left-0 right-0 mt-1 bg-white border shadow-lg z-50 p-2">
          <div className="grid grid-cols-5 gap-1">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleColorSelect(color.value)}
                className={`h-8 ${color.bgClass}`}
                title={color.label}
                aria-label={`Select ${color.label} color`}
              >
                {/* Simple dot for selected color */}
                {selectedColor === color.value && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        color.value === "border-white" ||
                        color.value === "border-yellow-500" ||
                        color.value === "border-lime-500" ||
                        color.value === "border-amber-500"
                          ? "bg-gray-800"
                          : "bg-white"
                      }`}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

ColorDropdown.propTypes = {
  selectedColor: PropTypes.string.isRequired,
  onColorChange: PropTypes.func.isRequired,
};

// Export the color options for use in other components
export { colorOptions };
