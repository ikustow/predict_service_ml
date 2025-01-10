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
    try {
        // Получаем тело запроса как массив
        const requestData = req.body;
        // Проверяем, что массив содержит данные
        if (!requestData || requestData.length === 0) {
            return res.status(400).json({ error: 'Invalid input structure' });
        }
        // Извлекаем `orders` и `query` из первого элемента массива
        const { orders, query } = requestData[0];
        if (!orders || !query || orders.length === 0 || query.length === 0) {
            return res.status(400).json({ error: 'Orders or query is missing' });
        }
        // Объединяем все заказы в один массив
        const flattenedOrders = orders.flatMap(orderGroup => orderGroup.data);
        // Парсим первый запрос из `query`
        const parsedQuery = JSON.parse(query[0].query);
        // Проверяем валидность запроса
        if (!parsedQuery.prediction_type || !parsedQuery.quantity || parsedQuery.quantity <= 0) {
            return res.status(400).json({ error: 'Invalid query parameters' });
        }
        // Выполняем предсказание
        const { predictions, products } = (0, predictionService_1.predictOrdersWithStats)(flattenedOrders, parsedQuery.prediction_type, parsedQuery.quantity);
        // Формируем ответ
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
