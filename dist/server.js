"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const predictionService_1 = require("./services/predictionService");
const app = (0, express_1.default)();
const port = 3000;
// Middleware for JSON parsing
app.use(body_parser_1.default.json());
// Endpoint for predictions
// @ts-ignore
app.post('/predict', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const requestData = req.body;
        // Проверяем наличие topdata
        if (!requestData || !Array.isArray(requestData) || !((_a = requestData[0]) === null || _a === void 0 ? void 0 : _a.topdata)) {
            return res.status(400).json({ error: 'Invalid input structure: topdata missing' });
        }
        const { orders, query } = requestData[0].topdata;
        if (!orders || !query || orders.length === 0 || query.length === 0) {
            return res.status(400).json({ error: 'Orders or query is missing or empty' });
        }
        // @ts-ignore
        const flattenedOrders = orders.flatMap(orderGroup => orderGroup.data);
        // Проверка и обработка поля query
        let parsedQuery;
        try {
            // Попытка распарсить строку как JSON
            parsedQuery = JSON.parse(query[0].query);
        }
        catch (e) {
            // Если строка не JSON, предполагаем альтернативный формат и парсим вручную
            console.warn('Attempting to process query as alternate format:', query[0].query);
            const altQueryRegex = /prediction_type - (\w+), quantity - (\d+)/;
            const match = query[0].query.match(altQueryRegex);
            if (match) {
                parsedQuery = {
                    prediction_type: match[1],
                    quantity: parseInt(match[2], 10)
                };
            }
            else {
                // Если не удалось обработать строку, возвращаем ошибку
                console.error('Invalid query format:', query[0].query);
                return res.status(400).json({ error: 'Invalid query format. Expected JSON string or alternate format.' });
            }
        }
        if (!parsedQuery.prediction_type || !parsedQuery.quantity || parsedQuery.quantity <= 0) {
            return res.status(400).json({ error: 'Invalid query parameters' });
        }
        const { predictions, products } = (0, predictionService_1.predictOrdersWithStats)(flattenedOrders, parsedQuery.prediction_type, parsedQuery.quantity);
        return res.status(200).json({
            predictions: predictions.map((value, index) => {
                const futureDate = new Date();
                switch (parsedQuery.prediction_type) {
                    case 'day':
                        futureDate.setDate(futureDate.getDate() + index + 1);
                        break;
                    case 'month':
                        futureDate.setMonth(futureDate.getMonth() + index + 1);
                        break;
                    case 'year':
                        futureDate.setFullYear(futureDate.getFullYear() + index + 1);
                        break;
                }
                return {
                    date: futureDate.toISOString(),
                    predicted_value: value,
                    period: parsedQuery.prediction_type,
                    type: 'orders',
                    products,
                };
            }),
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
// Test endpoint to check service health
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Service is running' });
});
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
