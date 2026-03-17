// __tests__/community.test.ts
import { submitCommunityPost } from "@/lib/community";

const mockInsert = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      insert: mockInsert,
    }),
  },
}));

describe("submitCommunityPost", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns { error: null } on success", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    const result = await submitCommunityPost("user-1", {
      post_type: "win",
      title: "Walked without crutches!",
      body: "First time in 6 weeks",
    });
    expect(result).toEqual({ error: null });
  });

  it("returns { error: message } when Supabase insert fails", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "Network error" } });
    const result = await submitCommunityPost("user-1", {
      post_type: "win",
      title: "Walked without crutches!",
      body: "First time in 6 weeks",
    });
    expect(result).toEqual({ error: "Network error" });
  });

  it("passes user_id and input to Supabase insert", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    await submitCommunityPost("user-abc", {
      post_type: "win",
      title: "My win",
      body: "Details",
    });
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-abc",
      post_type: "win",
      title: "My win",
      body: "Details",
    });
  });
});
