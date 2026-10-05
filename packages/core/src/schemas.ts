import { z } from 'zod';

export const ItineraryLegSchema = z.object({
  placeId: z.string().describe('The id of a provided candidate place'),
  order: z.number().int().describe('1-based position in the itinerary'),
  rationale: z.string().describe('One sentence on why this stop fits the traveler'),
});

export const ItineraryOutputSchema = z.object({
  title: z.string(),
  legs: z.array(ItineraryLegSchema),
  vibeTags: z.array(z.string()),
});

export type ItineraryOutput = z.infer<typeof ItineraryOutputSchema>;
