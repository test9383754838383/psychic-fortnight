import { useNavigate } from "@tanstack/react-router";
import { voyagesRoute } from "./voyages";
import { VoyagesList } from "../components/VoyagesList/VoyagesList";

export function VoyagesPage() {
  const filters = voyagesRoute.useSearch();
  const navigate = useNavigate({ from: voyagesRoute.fullPath });

  return (
    <VoyagesList
      filters={filters}
      onFilterChange={(f) => void navigate({ search: (s) => ({ ...s, ...f }) })}
      onVoyageClick={(id) =>
        void navigate({ to: "/voyages/$voyageId", params: { voyageId: id } })
      }
    />
  );
}
