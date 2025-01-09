export interface OrderData {
    order_id: string;
    customer_id: string;
    customer_name: string;
    product: string;
    quantity: number;
    price: number;
    order_date: {
        value: string;
    };
}

export interface QueryData {
    prediction_type: 'day' | 'month' | 'year';
    quantity: number;
}
