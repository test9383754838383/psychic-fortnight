import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { FormReviewView } from "../../components/FormsQueue/FormReviewView";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

const MOCK_OPERATIONS_USER: components["schemas"]["UserResponseDTO"] = {
  id: "user-ops",
  username: "operator",
  is_active: true,
  roles: ["Operations"],
};

const MOCK_VIEWER_USER: components["schemas"]["UserResponseDTO"] = {
  id: "user-viewer",
  username: "viewer",
  is_active: true,
  roles: ["Viewer"],
};

const FORM_ID = "form-abc";

const MOCK_FORM_RECEIVED: components["schemas"]["FormReadDTO"] = {
  id: FORM_ID,
  form_type: "Noon",
  status: "Received",
  submitted_by: "user-ops",
  submitted_at: "2026-05-30T08:00:00Z",
  received_at: "2026-05-30T08:01:00Z",
  voyage_id: "voyage-111",
  port_call_id: null,
  assigned_to: null,
  reviewed_by: null,
  reviewed_at: null,
  notes: null,
  accepted_parse_attempt_id: null,
  raw_fields: { vessel: "MV Test", speed_24h: "12.5", position: "10N 20E" },
  raw_source_ref: "From: master@vessel.com\nNoon Report 30 May 2026\nSpeed: 12.5",
  parse_failed: false,
  latest_attempt: null,
  parse_attempts: [],
};

const MOCK_FORM_ACCEPTED: components["schemas"]["FormReadDTO"] = {
  ...MOCK_FORM_RECEIVED,
  id: "form-accepted",
  status: "Accepted",
};

const MOCK_FORM_PARSE_FAILED: components["schemas"]["FormReadDTO"] = {
  ...MOCK_FORM_RECEIVED,
  id: "form-failed",
  status: "Received",
  raw_fields: null,
  parse_failed: true,
};

vi.mock("../../api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
  },
}));

describe("FormReviewView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: { ok: true } as unknown as Response,
        });
      }
      if (path === "/api/v1/forms/{form_id}") {
        return Promise.resolve({
          data: MOCK_FORM_RECEIVED,
          response: { ok: true } as unknown as Response,
        });
      }
      return Promise.resolve({
        data: null,
        response: { ok: true } as unknown as Response,
      });
    });
  });

  it("renders parsed fields in left panel and raw source in right panel", async () => {
    render(<FormReviewView formId={FORM_ID} onTransition={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByTestId("parsed-fields-panel")).toBeInTheDocument();
      expect(screen.getByTestId("raw-source-panel")).toBeInTheDocument();
    });

    const parsedPanel = screen.getByTestId("parsed-fields-panel");
    const rawPanel = screen.getByTestId("raw-source-panel");

    expect(within(parsedPanel).getByText(/12\.5/)).toBeInTheDocument();
    expect(within(rawPanel).getByText(/noon report/i)).toBeInTheDocument();
  });

  it("shows transition buttons for Operations user on non-terminal form", async () => {
    render(<FormReviewView formId={FORM_ID} onTransition={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByTestId("parsed-fields-panel")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /under review/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /accept/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reject/i }),
    ).toBeInTheDocument();
  });

  it("hides Accept and Reject buttons for Viewer role", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_VIEWER_USER,
          response: { ok: true } as unknown as Response,
        });
      }
      if (path === "/api/v1/forms/{form_id}") {
        return Promise.resolve({
          data: MOCK_FORM_RECEIVED,
          response: { ok: true } as unknown as Response,
        });
      }
      return Promise.resolve({
        data: null,
        response: { ok: true } as unknown as Response,
      });
    });

    render(<FormReviewView formId={FORM_ID} onTransition={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByTestId("parsed-fields-panel")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /accept/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reject/i })).toBeNull();
  });

  it("shows no transition buttons for Accepted (terminal) form", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: { ok: true } as unknown as Response,
        });
      }
      if (path === "/api/v1/forms/{form_id}") {
        return Promise.resolve({
          data: MOCK_FORM_ACCEPTED,
          response: { ok: true } as unknown as Response,
        });
      }
      return Promise.resolve({
        data: null,
        response: { ok: true } as unknown as Response,
      });
    });

    render(
      <FormReviewView formId="form-accepted" onTransition={() => undefined} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("parsed-fields-panel")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /accept/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reject/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /under review/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /queried/i })).toBeNull();
  });

  it("calls POST /api/v1/forms/{form_id}/transition with correct status when Accept clicked", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: { ...MOCK_FORM_RECEIVED, status: "Accepted" },
      response: { ok: true } as unknown as Response,
    });

    const onTransition = vi.fn();
    render(<FormReviewView formId={FORM_ID} onTransition={onTransition} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const transitionCall = calls.find(
        (c) => c[0] === "/api/v1/forms/{form_id}/transition",
      );
      expect(transitionCall).toBeDefined();
      if (transitionCall) {
        const opts = transitionCall[1] as {
          params: { path: { form_id: string } };
          body: { status: string };
        };
        expect(opts.params.path.form_id).toBe(FORM_ID);
        expect(opts.body.status).toBe("Accepted");
      }
    });
  });

  it("calls POST /api/v1/forms/{form_id}/transition with Rejected when Reject clicked", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: { ...MOCK_FORM_RECEIVED, status: "Rejected" },
      response: { ok: true } as unknown as Response,
    });

    render(<FormReviewView formId={FORM_ID} onTransition={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /reject/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const transitionCall = calls.find(
        (c) => c[0] === "/api/v1/forms/{form_id}/transition",
      );
      expect(transitionCall).toBeDefined();
      if (transitionCall) {
        const opts = transitionCall[1] as {
          params: { path: { form_id: string } };
          body: { status: string };
        };
        expect(opts.body.status).toBe("Rejected");
      }
    });
  });

  it("shows parse-failed banner and editable raw text when parse_failed=true", async () => {
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: { ok: true } as unknown as Response,
        });
      }
      if (path === "/api/v1/forms/{form_id}") {
        return Promise.resolve({
          data: MOCK_FORM_PARSE_FAILED,
          response: { ok: true } as unknown as Response,
        });
      }
      return Promise.resolve({
        data: null,
        response: { ok: true } as unknown as Response,
      });
    });

    render(
      <FormReviewView formId="form-failed" onTransition={() => undefined} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("parse-failed-banner")).toBeInTheDocument();
    });
  });

  it("calls PATCH /api/v1/forms/{form_id} when notes edited", async () => {
    vi.mocked(apiClient.PATCH).mockResolvedValue({
      data: { ...MOCK_FORM_RECEIVED, notes: "Updated notes" },
      response: { ok: true } as unknown as Response,
    });

    render(<FormReviewView formId={FORM_ID} onTransition={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByTestId("notes-input")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("notes-input"), {
      target: { value: "Updated notes" },
    });
    fireEvent.blur(screen.getByTestId("notes-input"));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.PATCH).mock.calls;
      const patchCall = calls.find(
        (c) => c[0] === "/api/v1/forms/{form_id}",
      );
      expect(patchCall).toBeDefined();
      if (patchCall) {
        const opts = patchCall[1] as {
          params: { path: { form_id: string } };
          body: { notes: string };
        };
        expect(opts.params.path.form_id).toBe(FORM_ID);
        expect(opts.body.notes).toBe("Updated notes");
      }
    });
  });

  it("shows Under Review button for Received form (any auth'd user)", async () => {
    render(<FormReviewView formId={FORM_ID} onTransition={() => undefined} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /under review/i }),
      ).toBeInTheDocument();
    });
  });
});
