export type AppNotification = {
    id: string;
    data: {
        kind?: string;
        title?: string;
        message?: string;
        url?: string;
        order_id?: number;
        till_id?: number;
    };
    read_at: string | null;
    created_at: string | null;
};

export type NotificationShared = {
    unread: number;
    recent: AppNotification[];
};
