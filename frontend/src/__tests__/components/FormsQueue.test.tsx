import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { FormsQueue } from "../../components/FormsQueue/FormsQueue";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

const MOCK_OPERATIONS_USER: components["schemas"]["UserResponseDTO"] = {
  id: "user-ops",
  username: "operator",
  is_active: true,
  roles: ["Operations"],
};

const MOCK_FORM_RECEIVED: components["schemas"]["FormReadDTO"] = {
  id: "form-001",
  form_type: "Noon",
  status: "Received",
  submitted_by: "user-ops",
  submitted_at: "2026-05-30T08:00:00Z",
  received_at: "2026-05-30T08:01:00Z",
  voyage_id: "voyage-aaa",
  port_call_id: null,
  assigned_to: null,
  reviewed_by: null,
  reviewed_at: null,
  notes: null,
  accepted_parse_attempt_id: null,
  raw_fields: { speed_24h: "12.5" },
  raw_source_ref: "Noon report 2026-05-30",
  parse_failed: false,
  latest_attempt: null,
  parse_attempts: [],
};

const MOCK_FORM_UNDER_REVIEW: components["schemas"]["FormReadDTO"] = {
  id: "form-002",
  form_type: "Arrival",
  status: "Under Review",
  submitted_by: "user-ops",
  submitted_at: "2026-05-31T09:00:00Z",
  received_at: "2026-05-31T09:01:00Z",
  voyage_id: null,
  port_call_id: "pc-bbb",
  assigned_to: null,
  reviewed_by: null,
  reviewed_at: null,
  notes: null,
  accepted_parse_attempt_id: null,
  raw_fields: null,
  raw_source_ref: null,
  parse_failed: false,
  latest_attempt: null,
  parse_attempts: [],
};

vi.mock("../../api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
  },
}));

describe("FormsQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: { ok: true } as unknown as Response,
        });
      }
      if (path === "/api/v1/forms") {
        return Promise.resolve({
          data: [MOCK_FORM_UNDER_REVIEW, MOCK_FORM_RECEIVED],
          response: { ok: true } as unknown as Response,
        });
      }
      return Promise.resolve({
        data: [],
        response: { ok: true } as unknown as Response,
      });
    });
  });

  it("renders empty state when no forms returned", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: { ok: true } as unknown as Response,
        });
      }
      if (path === "/api/v1/forms") {
        return Promise.resolve({
          data: [],
          response: { ok: true } as unknown as Response,
        });
      }
      return Promise.resolve({
        data: [],
        response: { ok: true } as unknown as Response,
      });
    });

    render(<FormsQueue onSelect={() => undefined} selectedId={null} />);

    await waitFor(() => {
      expect(screen.getByText(/no forms/i)).toBeInTheDocument();
    });
  });

  it("renders form rows with status chip, form_type, and received_at", async () => {
    render(<FormsQueue onSelect={() => undefined} selectedId={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("form-row-form-001")).toBeInTheDocument();
      expect(screen.getByTestId("form-row-form-002")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Received").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Under Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Noon").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Arrival").length).toBeGreaterThan(0);
  });

  it("shows anchor for voyage_id forms", async () => {
    render(<FormsQueue onSelect={() => undefined} selectedId={null} />);

    await waitFor(() => {
      expect(screen.getByText(/voyage-aaa/i)).toBeInTheDocument();
    });
  });

  it("shows anchor for port_call_id forms", async () => {
    render(<FormsQueue onSelect={() => undefined} selectedId={null} />);

    await waitFor(() => {
      expect(screen.getByText(/pc-bbb/i)).toBeInTheDocument();
    });
  });

  it("calls onSelect with form id when a row is clicked", async () => {
    const onSelect = vi.fn();
    render(<FormsQueue onSelect={onSelect} selectedId={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("form-row-form-001")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("form-row-form-001"));
    expect(onSelect).toHaveBeenCalledWith("form-001");
  });

  it("highlights the selected form row", async () => {
    render(
      <FormsQueue onSelect={() => undefined} selectedId="form-001" />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("form-row-form-001")).toBeInTheDocument();
    });

    expect(screen.getByTestId("form-row-form-001")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("filters by status when status filter changes", async () => {
    render(<FormsQueue onSelect={() => undefined} selectedId={null} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/status filter/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/status filter/i), {
      target: { value: "Received" },
    });

    await waitFor(() => {
      const calls = vi.mocked(apiClient.GET).mock.calls;
      const formsCalls = calls.filter((c) => c[0] === "/api/v1/forms");
      const lastCall = formsCalls[formsCalls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        const opts = lastCall[1] as {
          params?: { query?: { status?: string } };
        };
        expect(opts?.params?.query?.status).toBe("Received");
      }
    });
  });

  it("filters by form_type when type filter changes", async () => {
    render(<FormsQueue onSelect={() => undefined} selectedId={null} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/type filter/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/type filter/i), {
      target: { value: "Noon" },
    });

    await waitFor(() => {
      const calls = vi.mocked(apiClient.GET).mock.calls;
      const formsCalls = calls.filter((c) => c[0] === "/api/v1/forms");
      const lastCall = formsCalls[formsCalls.length - 1];
      expect(lastCall).toBeDefined();
      if (lastCall) {
        const opts = lastCall[1] as {
          params?: { query?: { form_type?: string } };
        };
        expect(opts?.params?.query?.form_type).toBe("Noon");
      }
    });
  });
});
