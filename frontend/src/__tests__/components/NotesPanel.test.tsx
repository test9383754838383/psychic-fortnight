import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotesPanel } from "../../components/NotesPanel/NotesPanel";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

const VOYAGE_ID = "voyage-notes-test-uuid";
const USER_ID = "user-notes-test-uuid";
const NOTE_ID = "note-uuid-001";
const ATT_ID = "att-uuid-001";

const MOCK_ATT: components["schemas"]["NoteAttachmentReadDTO"] = {
  id: ATT_ID,
  note_id: NOTE_ID,
  filename: "report.pdf",
  content_type: "application/pdf",
  size_bytes: 1024,
  uploaded_by: USER_ID,
  created_at: "2026-06-04T10:00:00Z",
};

const MOCK_NOTE: components["schemas"]["VoyageNoteReadDTO"] = {
  id: NOTE_ID,
  voyage_id: VOYAGE_ID,
  body: "Departure delayed due to weather",
  category: "Operational",
  priority: "High",
  author_user_id: USER_ID,
  created_at: "2026-06-04T10:00:00Z",
  updated_at: "2026-06-04T10:00:00Z",
  attachments: [],
};

const MOCK_NOTE_WITH_ATT: components["schemas"]["VoyageNoteReadDTO"] = {
  ...MOCK_NOTE,
  attachments: [MOCK_ATT],
};

vi.mock("../../api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
}));

const mockedClient = vi.mocked(apiClient);

describe("NotesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    mockedClient.GET.mockReturnValue(new Promise(() => {}));
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
  });

  it("renders empty state when no notes exist", async () => {
    mockedClient.GET.mockResolvedValue({ data: [] });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId("notes-empty")).toBeInTheDocument();
    });
  });

  it("renders a note with body, category, and priority chips", async () => {
    mockedClient.GET.mockResolvedValue({ data: [MOCK_NOTE] });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId(`note-card-${NOTE_ID}`)).toBeInTheDocument();
    });
    expect(screen.getByText("Departure delayed due to weather")).toBeInTheDocument();
    expect(screen.getAllByText("Operational").length).toBeGreaterThan(0);
    expect(screen.getAllByText("High").length).toBeGreaterThan(0);
  });

  it("renders attachment download link when note has attachments", async () => {
    mockedClient.GET.mockResolvedValue({ data: [MOCK_NOTE_WITH_ATT] });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId(`attachment-download-${ATT_ID}`)).toBeInTheDocument();
    });
    expect(screen.getByText(/report\.pdf/)).toBeInTheDocument();
  });

  it("renders create form with category and priority dropdowns", async () => {
    mockedClient.GET.mockResolvedValue({ data: [] });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId("note-create-form")).toBeInTheDocument();
    });
    expect(screen.getByTestId("note-category-select")).toBeInTheDocument();
    expect(screen.getByTestId("note-priority-select")).toBeInTheDocument();
  });

  it("create form save button is disabled when body is empty", async () => {
    mockedClient.GET.mockResolvedValue({ data: [] });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId("note-save-btn")).toBeInTheDocument();
    });
    expect(screen.getByTestId("note-save-btn")).toBeDisabled();
  });

  it("submits note creation via API", async () => {
    mockedClient.GET.mockResolvedValue({ data: [] });
    mockedClient.POST.mockResolvedValue({ data: MOCK_NOTE });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId("note-body-input")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("note-body-input"), {
      target: { value: "Port delay noted" },
    });
    fireEvent.change(screen.getByTestId("note-category-select"), {
      target: { value: "Safety" },
    });
    fireEvent.change(screen.getByTestId("note-priority-select"), {
      target: { value: "High" },
    });

    fireEvent.click(screen.getByTestId("note-save-btn"));

    await waitFor(() => {
      expect(mockedClient.POST).toHaveBeenCalledWith(
        "/api/v1/voyages/{voyage_id}/notes",
        expect.objectContaining({
          body: { body: "Port delay noted", category: "Safety", priority: "High" },
        })
      );
    });
  });

  it("renders edit and delete buttons for each note", async () => {
    mockedClient.GET.mockResolvedValue({ data: [MOCK_NOTE] });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId(`note-edit-btn-${NOTE_ID}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId(`note-delete-btn-${NOTE_ID}`)).toBeInTheDocument();
  });

  it("clicking edit shows edit form with current values", async () => {
    mockedClient.GET.mockResolvedValue({ data: [MOCK_NOTE] });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId(`note-edit-btn-${NOTE_ID}`)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId(`note-edit-btn-${NOTE_ID}`));

    expect(screen.getByTestId(`note-edit-form-${NOTE_ID}`)).toBeInTheDocument();
    expect(
      (screen.getByTestId(`note-edit-body-${NOTE_ID}`) as HTMLTextAreaElement).value
    ).toBe("Departure delayed due to weather");
  });

  it("attach button is disabled when no file selected", async () => {
    mockedClient.GET.mockResolvedValue({ data: [MOCK_NOTE] });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId(`note-attach-btn-${NOTE_ID}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId(`note-attach-btn-${NOTE_ID}`)).toBeDisabled();
  });

  it("attachment delete button calls DELETE endpoint", async () => {
    mockedClient.GET.mockResolvedValue({ data: [MOCK_NOTE_WITH_ATT] });
    mockedClient.DELETE.mockResolvedValue({ data: null });
    // Suppress window.confirm
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId(`attachment-delete-${ATT_ID}`)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId(`attachment-delete-${ATT_ID}`));

    await waitFor(() => {
      expect(mockedClient.DELETE).toHaveBeenCalledWith(
        "/api/v1/attachments/{att_id}",
        expect.objectContaining({ params: { path: { att_id: ATT_ID } } })
      );
    });
  });

  it("category dropdown contains all 4 categories", async () => {
    mockedClient.GET.mockResolvedValue({ data: [] });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId("note-category-select")).toBeInTheDocument();
    });
    const select = screen.getByTestId("note-category-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("Operational");
    expect(options).toContain("Commercial");
    expect(options).toContain("Safety");
    expect(options).toContain("Agent");
  });

  it("priority dropdown contains all 3 priorities", async () => {
    mockedClient.GET.mockResolvedValue({ data: [] });
    render(<NotesPanel voyageId={VOYAGE_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId("note-priority-select")).toBeInTheDocument();
    });
    const select = screen.getByTestId("note-priority-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("Low");
    expect(options).toContain("Normal");
    expect(options).toContain("High");
  });
});
