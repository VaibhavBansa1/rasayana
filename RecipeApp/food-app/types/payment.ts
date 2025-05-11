export interface CreateOrderRequest {
    recipe_id: number;
    servings: number;
    delivery_address: string;
    // delivery_time: string;
    special_instructions?: string;
    contact_number: string;
}

export interface OrderDetails {
    order_id: string;
    amount: number;
    currency: string;
    key: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    estimated_delivery_time?: string;
    delivery_address: string;
    special_instructions?: string;
    contact_number: string;
    recipe: {
        id: number;
        title: string;
        image: string;
        external_image?: string;
    };
}

export interface PaymentData {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

export interface OrderHistory {
    order_id: string;
    recipe_title: string;
    recipe_image: string;
    amount: number;
    servings: number;
    status: OrderDetails['status'];
    ordered_at: string;
    delivery_address: string;
    contact_number: string;
    estimated_delivery_time?: string;
    payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    image: string;
    order_id: string;
    prefill: {
        name?: string;
        email?: string;
        contact?: string;
    };
    notes?: {
        [key: string]: string;
    };
    theme: {
        color: string;
    };
}

export interface SearchResult {
    display_name: string;
    lat: number;
    lon: number;
    type: string;
    address: {
        road?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
    };
}