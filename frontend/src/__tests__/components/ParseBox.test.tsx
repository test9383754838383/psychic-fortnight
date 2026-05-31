import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ParseBox } from "../../components/FormsQueue/ParseBox";
import { render } from "../../test/test-utils";
import { apiClient } from "../../api/client";
import type { components } from "../../api/schema";

const MOCK_OPERATIONS_USER: components["schemas"]["UserResponseDTO"] = {
  id: "user-ops",
  username: "operator",
  is_active: true,
  roles: ["Operations"],
};

const MOCK_FORM_CREATED: components["schemas"]["FormReadDTO"] = {
  id: "form-new",
  form_type: "Noon",
  status: "Received",
  submitted_by: "user-ops",
  submitted_at: "2026-05-30T08:00:00Z",
  received_at: "2026-05-30T08:01:00Z",
  voyage_id: "voyage-xyz",
  port_call_id: null,
  assigned_to: null,
  reviewed_by: null,
  reviewed_at: null,
  notes: null,
  accepted_parse_attempt_id: null,
  raw_fields: { speed_24h: "12.5" },
  raw_source_ref: "pasted text",
  parse_failed: false,
  latest_attempt: null,
  parse_attempts: [],
};

const MOCK_FORM_PARSE_FAILED: components["schemas"]["FormReadDTO"] = {
  ...MOCK_FORM_CREATED,
  id: "form-failed",
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

describe("ParseBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.GET).mockImplementation((path) => {
      if (path === "/api/v1/auth/me") {
        return Promise.resolve({
          data: MOCK_OPERATIONS_USER,
          response: { ok: true } as unknown as Response,
        });
      }
      return Promise.resolve({
        data: null,
        response: { ok: true } as unknown as Response,
      });
    });
  });

  it("renders raw text textarea, form_type selector, and submit button", () => {
    render(<ParseBox onParsed={() => undefined} />);

    expect(screen.getByLabelText(/raw text/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/form type/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /parse/i }),
    ).toBeInTheDocument();
  });

  it("renders voyage_id and port_call_id anchor inputs", () => {
    render(<ParseBox onParsed={() => undefined} />);

    expect(screen.getByLabelText(/voyage id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/port call id/i)).toBeInTheDocument();
  });

  it("calls POST /api/v1/forms/parse with raw_text, form_type, and voyage_id", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_FORM_CREATED,
      response: { ok: true, status: 201 } as unknown as Response,
    });

    render(<ParseBox onParsed={() => undefined} />);

    fireEvent.change(screen.getByLabelText(/raw text/i), {
      target: { value: "Noon report text here" },
    });
    fireEvent.change(screen.getByLabelText(/form type/i), {
      target: { value: "Noon" },
    });
    fireEvent.change(screen.getByLabelText(/voyage id/i), {
      target: { value: "voyage-xyz" },
    });

    fireEvent.click(screen.getByRole("button", { name: /parse/i }));

    await waitFor(() => {
      const calls = vi.mocked(apiClient.POST).mock.calls;
      const parseCall = calls.find((c) => c[0] === "/api/v1/forms/parse");
      expect(parseCall).toBeDefined();
      if (parseCall) {
        const opts = parseCall[1] as {
          body: {
            raw_text: string;
            form_type: string;
            voyage_id?: string;
          };
        };
        expect(opts.body.raw_text).toBe("Noon report text here");
        expect(opts.body.form_type).toBe("Noon");
        expect(opts.body.voyage_id).toBe("voyage-xyz");
      }
    });
  });

  it("calls onParsed callback with the created form on success", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_FORM_CREATED,
      response: { ok: true, status: 201 } as unknown as Response,
    });

    const onParsed = vi.fn();
    render(<ParseBox onParsed={onParsed} />);

    fireEvent.change(screen.getByLabelText(/raw text/i), {
      target: { value: "Some noon report text" },
    });
    fireEvent.change(screen.getByLabelText(/form type/i), {
      target: { value: "Noon" },
    });
    fireEvent.change(screen.getByLabelText(/voyage id/i), {
      target: { value: "voyage-xyz" },
    });

    fireEvent.click(screen.getByRole("button", { name: /parse/i }));

    await waitFor(() => {
      expect(onParsed).toHaveBeenCalledWith(MOCK_FORM_CREATED);
    });
  });

  it("shows parse-failed warning when response has parse_failed=true", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: MOCK_FORM_PARSE_FAILED,
      response: { ok: true, status: 201 } as unknown as Response,
    });

    render(<ParseBox onParsed={() => undefined} />);

    fireEvent.change(screen.getByLabelText(/raw text/i), {
      target: { value: "bad text" },
    });
    fireEvent.change(screen.getByLabelText(/form type/i), {
      target: { value: "Noon" },
    });
    fireEvent.change(screen.getByLabelText(/voyage id/i), {
      target: { value: "voyage-xyz" },
    });

    fireEvent.click(screen.getByRole("button", { name: /parse/i }));

    await waitFor(() => {
      expect(screen.getByTestId("parse-failed-warning")).toBeInTheDocument();
    });
  });

  it("shows error message when API call fails", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({
      data: undefined,
      error: { detail: "Internal error" },
      response: { ok: false, status: 500 } as unknown as Response,
    });

    render(<ParseBox onParsed={() => undefined} />);

    fireEvent.change(screen.getByLabelText(/raw text/i), {
      target: { value: "text" },
    });
    fireEvent.change(screen.getByLabelText(/form type/i), {
      target: { value: "Noon" },
    });
    fireEvent.change(screen.getByLabelText(/voyage id/i), {
      target: { value: "voyage-xyz" },
    });

    fireEvent.click(screen.getByRole("button", { name: /parse/i }));

    await waitFor(() => {
      expect(screen.getByTestId("parse-error")).toBeInTheDocument();
    });
  });
});
