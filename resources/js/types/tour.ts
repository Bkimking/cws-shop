export type TourStep = {
    key: string;
    title: string;
    description: string;
    href: string;
    icon: string;
};

export type TourShared = {
    steps: TourStep[];
    completed_steps: string[];
    current_step: string | null;
    resume_step: string | null;
    started: boolean;
    should_prompt: boolean;
    completed_at: string | null;
    skipped_at: string | null;
    guide_url: string | null;
};
