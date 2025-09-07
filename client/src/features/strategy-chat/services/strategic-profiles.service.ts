import { apiRequest } from "@/lib/queryClient";
import type { StrategicProfile } from "../types";

/**
 * Strategic Profiles API Service
 * Handles API interactions for strategic profiles/products
 */

export const strategicProfilesService = {
  /**
   * Get all strategic profiles for the user
   */
  async getProfiles(): Promise<StrategicProfile[]> {
    return apiRequest("/api/products");
  },

  /**
   * Get a single strategic profile by ID
   */
  async getProfile(id: number): Promise<StrategicProfile> {
    return apiRequest(`/api/products/${id}`);
  },

  /**
   * Create a new strategic profile
   */
  async createProfile(data: Partial<StrategicProfile>): Promise<StrategicProfile> {
    return apiRequest("/api/products", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * Update an existing strategic profile
   */
  async updateProfile(id: number, data: Partial<StrategicProfile>): Promise<StrategicProfile> {
    return apiRequest(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  /**
   * Delete a strategic profile
   */
  async deleteProfile(id: number): Promise<void> {
    return apiRequest(`/api/products/${id}`, {
      method: "DELETE"
    });
  },

  /**
   * Save generated product offers
   */
  async saveProductOffers(productId: number, offers: any) {
    return apiRequest("/api/products/offers", {
      method: "POST",
      body: JSON.stringify({ productId, offers })
    });
  }
};