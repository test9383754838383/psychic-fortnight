import React, { useState, useEffect, useMemo } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useMultipleSelection, useCombobox } from "downshift";
import { format, parseISO } from "date-fns";

export interface ScheduleFilters {
  dateFrom: string;
  dateTo: string;
  vesselIds: string[];
  statuses: string[];
  search: string;
}

interface ScheduleFilterBarProps {
  filters: ScheduleFilters;
  onFilterChange: (filters: ScheduleFilters) => void;
  availableVessels: { id: string; name: string }[];
}

const AVAILABLE_STATUSES = ["Scheduled", "Commenced", "Completed", "Closed", "Cancelled"];

export const ScheduleFilterBar: React.FC<ScheduleFilterBarProps> = ({
  filters,
  onFilterChange,
  availableVessels,
}) => {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, filters, onFilterChange]);

  // Date Range Picker
  const selectedRange: DateRange | undefined = useMemo(() => ({
    from: parseISO(filters.dateFrom),
    to: parseISO(filters.dateTo),
  }), [filters.dateFrom, filters.dateTo]);

  const handleSelectRange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onFilterChange({
        ...filters,
        dateFrom: format(range.from, "yyyy-MM-dd"),
        dateTo: format(range.to, "yyyy-MM-dd"),
      });
    }
  };

  // Vessel Multi-select
  const {
    getSelectedItemProps,
    addSelectedItem,
    removeSelectedItem,
    selectedItems: selectedVessels,
  } = useMultipleSelection({
    selectedItems: availableVessels.filter((v) => filters.vesselIds.includes(v.id)),
    onSelectedItemsChange: ({ selectedItems }) => {
      onFilterChange({
        ...filters,
        vesselIds: selectedItems?.map((v) => v.id) ?? [],
      });
    },
  });

  const {
    isOpen: isVesselOpen,
    getToggleButtonProps: getVesselToggleProps,
    getLabelProps: getVesselLabelProps,
    getMenuProps: getVesselMenuProps,
    getItemProps: getVesselItemProps,
  } = useCombobox({
    items: availableVessels.filter((v) => !filters.vesselIds.includes(v.id)),
    itemToString: (item) => (item ? item.name : ""),
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        addSelectedItem(selectedItem);
      }
    },
  });

  // Status Multi-select
  const {
    selectedItems: selectedStatuses,
    addSelectedItem: addStatus,
    removeSelectedItem: removeStatus,
  } = useMultipleSelection({
    selectedItems: filters.statuses,
    onSelectedItemsChange: ({ selectedItems }) => {
      onFilterChange({
        ...filters,
        statuses: selectedItems ?? [],
      });
    },
  });

  const {
    isOpen: isStatusOpen,
    getToggleButtonProps: getStatusToggleProps,
    getMenuProps: getStatusMenuProps,
    getItemProps: getStatusItemProps,
  } = useCombobox({
    items: AVAILABLE_STATUSES.filter((s) => !filters.statuses.includes(s)),
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        addStatus(selectedItem);
      }
    },
  });

  return (
    <div className="filter-bar" style={{ padding: "1rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", marginBottom: "1rem", border: "1px solid var(--border-glass)" }}>
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        
        {/* Date Picker */}
        <div className="filter-item">
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Date Range</label>
          <div className="date-picker-container" style={{ position: "relative" }}>
             <button 
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                style={{ padding: "0.5rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", cursor: "pointer" }}
             >
                {format(parseISO(filters.dateFrom), "PP")} - {format(parseISO(filters.dateTo), "PP")}
             </button>
             {isDatePickerOpen && (
               <div style={{ position: "absolute", top: "100%", zIndex: 100, background: "var(--bg-secondary)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-sm)", marginTop: "0.5rem", boxShadow: "var(--shadow-card)" }}>
                  <DayPicker 
                    mode="range" 
                    selected={selectedRange} 
                    onSelect={(range) => {
                      handleSelectRange(range);
                      if (range?.from && range?.to) setIsDatePickerOpen(false);
                    }} 
                  />
               </div>
             )}
          </div>
        </div>

        {/* Vessel Filter */}
        <div className="filter-item" style={{ minWidth: "200px" }}>
          <label {...getVesselLabelProps()} style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Vessels</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", padding: "0.25rem", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.05)" }}>
            {selectedVessels.map((v, index) => (
              <span key={v.id} {...getSelectedItemProps({ selectedItem: v, index })} style={{ background: "var(--accent-primary)", color: "var(--bg-primary)", padding: "0.125rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                {v.name}
                <button onClick={() => removeSelectedItem(v)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--bg-primary)", fontWeight: "bold" }}>×</button>
              </span>
            ))}
            <button {...getVesselToggleProps()} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>Select vessel...</button>
          </div>
          <ul {...getVesselMenuProps()} style={{ listStyle: "none", padding: 0, margin: 0, background: "var(--bg-secondary)", border: isVesselOpen ? "1px solid var(--border-glass)" : "none", position: "absolute", zIndex: 30, maxHeight: "200px", overflowY: "auto" }}>
            {isVesselOpen && availableVessels.filter(v => !filters.vesselIds.includes(v.id)).map((item, index) => (
              <li key={item.id} {...getVesselItemProps({ item, index })} style={{ padding: "0.5rem", cursor: "pointer", background: "transparent" }}>
                {item.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Status Filter */}
        <div className="filter-item" style={{ minWidth: "150px" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Status</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", padding: "0.25rem", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.05)" }}>
            {selectedStatuses.map((s) => (
              <span key={s} style={{ background: "var(--accent-secondary)", color: "white", padding: "0.125rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                {s}
                <button onClick={() => removeStatus(s)} style={{ border: "none", background: "none", cursor: "pointer", color: "white", fontWeight: "bold" }}>×</button>
              </span>
            ))}
            <button {...getStatusToggleProps()} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>Select status...</button>
          </div>
          <ul {...getStatusMenuProps()} style={{ listStyle: "none", padding: 0, margin: 0, background: "var(--bg-secondary)", border: isStatusOpen ? "1px solid var(--border-glass)" : "none", position: "absolute", zIndex: 30 }}>
            {isStatusOpen && AVAILABLE_STATUSES.filter(s => !filters.statuses.includes(s)).map((item, index) => (
              <li key={item} {...getStatusItemProps({ item, index })} style={{ padding: "0.5rem", cursor: "pointer" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Search Input */}
        <div className="filter-item">
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Search Voyage</label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. V001"
            style={{ padding: "0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
          />
        </div>

      </div>
    </div>
  );
};
