export interface FilterCriteria {
    earthquake: 'DD-1' | 'DD-2' | 'DD-3' | null;
    performance: 'SH' | 'KH' | 'GO' | null;
    direction: 'X' | 'Y' | null;
  }
  
  // Define specific properties we know about for result rows
  export interface ResultRow {
    Bina_analiz_deprem?: string;
    Bina_yuk_kombinasyon?: string;
    Bina_kat?: string;
    Bina_SH?: string;
    Bina_KH?: string;
    Bina_GO?: string;
    // You can add more known properties here
    
    // For any remaining unknown properties
    [key: string]: string | number | boolean | undefined;
  }
  
  export interface StoryPerformance {
    story: string;
    performanceStatus: 'Sağlıyor' | 'Sağlamıyor';
    isCurrentVersion: boolean;
  }