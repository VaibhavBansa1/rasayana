export interface RelatedRecipe {
    id: number;
    title: string;
    image: string | null;
    external_image: string | null;
}

export interface NotificationData {
    type?: string;
    userId?: string;
    recipeId?: number;
    milestone?: number;
    milestoneType?: string;
    orderId?: string;
    amount?: string;
}

export interface Notification {
    id: string;
    type: 'like' | 'follow' | 'system' | 'confirmation' ;
    title: string;
    message: string;
    data: NotificationData;
    is_read: boolean;
    created_at: string;
    related_recipe?: RelatedRecipe;
}