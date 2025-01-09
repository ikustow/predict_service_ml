"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictOrders = void 0;
const tf = __importStar(require("@tensorflow/tfjs-node"));
const predictOrders = (orders, period, count) => __awaiter(void 0, void 0, void 0, function* () {
    // Prepare data for training
    const productQuantities = orders.reduce((acc, order) => {
        if (!acc[order.product]) {
            acc[order.product] = [];
        }
        acc[order.product].push(order.quantity);
        return acc;
    }, {});
    // Train a simple linear regression model for each product
    const productModels = {};
    for (const product in productQuantities) {
        const xs = tf.tensor2d(productQuantities[product].map((_, i) => [i]));
        const ys = tf.tensor2d(productQuantities[product].map((q) => [q]));
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });
        yield model.fit(xs, ys, { epochs: 50 });
        productModels[product] = model;
    }
    // Generate predictions
    const now = new Date();
    const predictions = Array.from({ length: count }, (_, i) => {
        const futureDate = new Date(now);
        switch (period) {
            case 'day':
                futureDate.setDate(futureDate.getDate() + i + 1);
                break;
            case 'month':
                futureDate.setMonth(futureDate.getMonth() + i + 1);
                break;
            case 'year':
                futureDate.setFullYear(futureDate.getFullYear() + i + 1);
                break;
        }
        const products = Object.entries(productModels).map(([product, model]) => {
            const prediction = model.predict(tf.tensor2d([[i + productQuantities[product].length]]));
            const predictedValue = prediction.dataSync()[0];
            return { product, predicted_average_quantity: predictedValue };
        });
        const totalPredictedValue = products.reduce((sum, p) => sum + p.predicted_average_quantity, 0);
        return {
            date: futureDate.toISOString(),
            predicted_value_of_orders: totalPredictedValue,
            products,
        };
    });
    return predictions;
});
exports.predictOrders = predictOrders;
