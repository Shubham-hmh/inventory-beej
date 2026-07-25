import mongoose, { Schema, Document, Model } from 'mongoose';
import './Item'; // Make sure Item is registered

export interface IStockInput extends Document {
  itemId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number; // Purchase price
  date: Date;
  supplier: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockInputSchema: Schema<IStockInput> = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    supplier: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const StockInput: Model<IStockInput> = mongoose.models.StockInput || mongoose.model<IStockInput>('StockInput', StockInputSchema);

export default StockInput;
