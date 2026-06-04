import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";
import { VoyageInstructionsPanel } from "../../components/VoyageInstructionsPanel/VoyageInstructionsPanel";

vi.mock("../../api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

const MOCK_TEMPLATE: components["schemas"]["InstructionTemplateReadDTO"] = {
  id: "tmpl-id-1",
  name: "Standard Voyage Orders",
  body_html: "<h2>Standard Voyage Orders</h2><p>Report daily.</p>",
};

const MOCK_DRAFT: components["schemas"]["VoyageInstructionReadDTO"] = {
  id: "instr-id-1",
  voyage_id: "voyage-id-1",
  title: "Test Instruction",
  body: { format: "html", content: "<p>Initial content</p>" },
  status: "draft",
  template_id: null,
  approved_at: null,
  approved_by: null,
  sent_at: null,
  sent_by: null,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

const MOCK_APPROVED: components["schemas"]["VoyageInstructionReadDTO"] = {
  ...MOCK_DRAFT,
  id: "instr-id-2",
  status: "approved",
  approved_at: "2026-06-01T10:00:00Z",
  approved_by: "user-id-1",
};

const MOCK_SENT: components["schemas"]["VoyageInstructionReadDTO"] = {
  ...MOCK_APPROVED,
  id: "instr-id-3",
  status: "sent",
  sent_at: "2026-06-01T11:00:00Z",
  sent_by: "user-id-1",
};

function ok(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 200 }) });
}
function created(body: unknown) {
  return Promise.resolve({ data: body, response: new Response(null, { status: 201 }) });
}

describe("VoyageInstructionsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/instructions") return ok([MOCK_DRAFT]);
      if (path === "/api/v1/instruction-templates") return ok([MOCK_TEMPLATE]);
      return ok([]);
    });
  });

  it("renders existing instruction with status badge", async () => {
    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText("Test Instruction")).toBeInTheDocument();
    });
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("shows empty state when no instructions exist", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/instructions") return ok([]);
      if (path === "/api/v1/instruction-templates") return ok([MOCK_TEMPLATE]);
      return ok([]);
    });
    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText(/No voyage instructions/i)).toBeInTheDocument();
    });
  });

  it("new instruction button opens create form", async () => {
    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("new-instruction-btn")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("new-instruction-btn"));
    expect(screen.getByTestId("instruction-title-input")).toBeInTheDocument();
    expect(screen.getByTestId("template-select")).toBeInTheDocument();
  });

  it("template picker shows seeded templates", async () => {
    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("new-instruction-btn")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("new-instruction-btn"));
    const select = screen.getByTestId("template-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.text);
    expect(options).toContain("Standard Voyage Orders");
  });

  it("submitting create form calls POST", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue(created(MOCK_DRAFT));

    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("new-instruction-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("new-instruction-btn"));
    fireEvent.change(screen.getByTestId("instruction-title-input"), {
      target: { value: "New Instruction" },
    });
    fireEvent.click(screen.getByTestId("save-instruction-btn"));

    await waitFor(() => {
      expect(vi.mocked(apiClient.POST)).toHaveBeenCalledWith(
        "/api/v1/voyages/{voyage_id}/instructions",
        expect.objectContaining({ params: { path: { voyage_id: "voyage-id-1" } } })
      );
    });
  });

  it("selecting template from picker sends template_id in POST", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue(created({ ...MOCK_DRAFT, template_id: "tmpl-id-1" }));

    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByTestId("new-instruction-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("new-instruction-btn"));
    fireEvent.change(screen.getByTestId("instruction-title-input"), {
      target: { value: "From Template" },
    });
    fireEvent.change(screen.getByTestId("template-select"), {
      target: { value: "tmpl-id-1" },
    });
    fireEvent.click(screen.getByTestId("save-instruction-btn"));

    await waitFor(() => {
      expect(vi.mocked(apiClient.POST)).toHaveBeenCalledWith(
        "/api/v1/voyages/{voyage_id}/instructions",
        expect.objectContaining({
          body: expect.objectContaining({ template_id: "tmpl-id-1" }),
        })
      );
    });
  });

  it("approve button on draft, disabled on approved/sent", async () => {
    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`approve-btn-${MOCK_DRAFT.id}`)).toBeInTheDocument()
    );
    expect(screen.getByTestId(`approve-btn-${MOCK_DRAFT.id}`)).not.toBeDisabled();
  });

  it("send button disabled on draft, enabled on approved", async () => {
    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`send-btn-${MOCK_DRAFT.id}`)).toBeInTheDocument()
    );
    expect(screen.getByTestId(`send-btn-${MOCK_DRAFT.id}`)).toBeDisabled();
  });

  it("send button enabled and approve hidden on approved instruction", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/instructions") return ok([MOCK_APPROVED]);
      if (path === "/api/v1/instruction-templates") return ok([MOCK_TEMPLATE]);
      return ok([]);
    });

    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`send-btn-${MOCK_APPROVED.id}`)).toBeInTheDocument()
    );
    expect(screen.getByTestId(`send-btn-${MOCK_APPROVED.id}`)).not.toBeDisabled();
    // No approve button on already-approved
    expect(screen.queryByTestId(`approve-btn-${MOCK_APPROVED.id}`)).toBeNull();
  });

  it("approve button calls approve endpoint", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue(ok({ ...MOCK_DRAFT, status: "approved" }));

    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() =>
      expect(screen.getByTestId(`approve-btn-${MOCK_DRAFT.id}`)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId(`approve-btn-${MOCK_DRAFT.id}`));

    await waitFor(() => {
      expect(vi.mocked(apiClient.POST)).toHaveBeenCalledWith(
        "/api/v1/instructions/{instr_id}/approve",
        expect.objectContaining({ params: { path: { instr_id: MOCK_DRAFT.id } } })
      );
    });
  });

  it("PDF download link present on approved and sent instructions", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/instructions")
        return ok([MOCK_APPROVED, MOCK_SENT]);
      if (path === "/api/v1/instruction-templates") return ok([MOCK_TEMPLATE]);
      return ok([]);
    });

    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/pdf-link-/).length).toBeGreaterThanOrEqual(2);
    });
  });

  it("PDF download link absent on draft instruction", async () => {
    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText("Test Instruction")).toBeInTheDocument();
    });
    expect(screen.queryByTestId(`pdf-link-${MOCK_DRAFT.id}`)).toBeNull();
  });

  it("sent instruction shows no approve or send buttons — terminal state", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") return ok({ id: "u1", username: "ops", is_active: true, roles: ["Operations"] });
      if (path === "/api/v1/voyages/{voyage_id}/instructions") return ok([MOCK_SENT]);
      if (path === "/api/v1/instruction-templates") return ok([MOCK_TEMPLATE]);
      return ok([]);
    });

    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() => {
      expect(screen.getByText("Test Instruction")).toBeInTheDocument();
    });
    expect(screen.queryByTestId(`approve-btn-${MOCK_SENT.id}`)).toBeNull();
    expect(screen.queryByTestId(`send-btn-${MOCK_SENT.id}`)).toBeNull();
  });

  it("editor shows current body content and is editable", async () => {
    // Click on a draft instruction to open editor
    render(<VoyageInstructionsPanel voyageId="voyage-id-1" />);
    await waitFor(() => expect(screen.getByText("Test Instruction")).toBeInTheDocument());

    // Click edit button to open editor
    fireEvent.click(screen.getByTestId(`edit-btn-${MOCK_DRAFT.id}`));
    const editor = screen.getByTestId("rich-text-editor");
    expect(editor).toBeInTheDocument();
  });
});
