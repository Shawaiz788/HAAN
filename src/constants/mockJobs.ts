import { LiveJob } from '@/types';

export const MOCK_JOBS: LiveJob[] = [
    {
        id: 1,
        title: 'Split AC install — 1.5 ton',
        category: 'AC Service',
        budget: 4200,
        distance_km: 5.0,
        location_name: 'Cavalry Ground, Lahore',
        location_area: 'Main Cavalry Chowk',
        customer_name: 'Zara Anwar',
        customer_rating: 4.8,
        scheduled_date: new Date().toISOString(),
        description: 'Looking for a professional to install a new split AC (1.5 ton) in my living room. Low floor installation, mounting bracket is already fixed. Please bring vacuum pump and basic installation tools.',
        attachments: [
            'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=500',
            'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500'
        ]
    },
    {
        id: 2,
        title: 'DB wiring — 3-bed apartment',
        category: 'Electrician',
        budget: 3500,
        distance_km: 2.3,
        location_name: 'DHA Phase 5, Lahore',
        location_area: 'Block E Commercial',
        customer_name: 'Ali Hassan',
        customer_rating: 4.5,
        description: 'Complete Distribution Box (DB) wiring for a new 3-bedroom apartment. Phase selector switch and main breaker installation required. Wiring cables are already provided.',
        attachments: [
            'https://images.unsplash.com/photo-1558224494-ef8b217500d6?w=500'
        ]
    },
    {
        id: 3,
        title: 'Bathroom tap + shower replacement',
        category: 'Plumber',
        budget: 2800,
        distance_km: 7.1,
        location_name: 'Gulberg III, Lahore',
        location_area: 'Main Boulevard',
        customer_name: 'Sana Khan',
        customer_rating: 4.9,
        description: 'Replace the existing leaking mixer tap in the master bathroom and install a new wall-mounted shower head. All hardware and taps are purchased and ready for installation.',
        attachments: []
    },
];
