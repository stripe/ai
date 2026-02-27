import Stripe from 'stripe';

export type OfferState =
  | Stripe.Capital.FinancingOfferListParams.Status
  | 'no_offer';
