// __tests__/community.test.ts
import { submitCommunityPost } from "@/lib/community";
import type { CommunityIdentity } from "@/lib/community-identity";

const mockInsert = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      insert: mockInsert,
    }),
  },
}));

const mockIdentity: CommunityIdentity = {
  deviceId: "device-abc",
  animalName: "Brave Penguin",
  phase: "Week 8",
};

describe("submitCommunityPost", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns { error: null } on success", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    const result = await submitCommunityPost(mockIdentity, {
      post_type: "win",
      title: "Walked without crutches!",
      body: "First time in 6 weeks",
    });
    expect(result).toEqual({ error: null });
  });

  it("returns { error: message } when Supabase insert fails", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "Network error" } });
    const result = await submitCommunityPost(mockIdentity, {
      post_type: "win",
      title: "Walked without crutches!",
      body: "First time in 6 weeks",
    });
    expect(result).toEqual({ error: "Network error" });
  });

  it("passes device_id, author_animal_name, author_phase and input to Supabase insert", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    await submitCommunityPost(mockIdentity, {
      post_type: "win",
      title: "My win",
      body: "Details",
    });
    expect(mockInsert).toHaveBeenCalledWith({
      device_id: "device-abc",
      author_animal_name: "Brave Penguin",
      author_phase: "Week 8",
      post_type: "win",
      title: "My win",
      body: "Details",
    });
  });
});
