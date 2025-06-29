import { Schema, model } from 'mongoose';

const clientSchema = new Schema({
  clientName: { type: String, required: true },
  instagramPageId: { type: String, required: true, unique: true },
  metaPageToken: { type: String, required: true },
  platform: { type: String, required: true, enum: ['SHOPIFY', 'WOOCOMMERCE'] },
  shopifyStoreName: { type: String },
  shopifyAccessToken: { type: String },
  woocommerceSiteUrl: { type: String },
  woocommerceConsumerKey: { type: String },
  woocommerceConsumerSecret: { type: String },
  subscriptionStatus: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

const Client = model('Client', clientSchema);
export default Client;
