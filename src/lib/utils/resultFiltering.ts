import type { FilterCriteria, ResultRow, StoryPerformance } from '$lib/types/FilterTypes';

/**
 * Filter results data based on selected filter criteria
 * @param results The full results data to filter
 * @param filters The selected filter criteria
 * @returns Filtered results matching the criteria
 */
export function filterResultsData(
  results: ResultRow[],
  filters: FilterCriteria
): ResultRow[] {
  if (!results || results.length === 0) {
    return [];
  }

  // If no filters are applied, return the original data
  if (!filters.earthquake && !filters.performance && !filters.direction) {
    return results;
  }

  return results.filter((row) => {
    let matchesEarthquake = true;
    let matchesDirection = true;

    // Filter by earthquake level
    if (filters.earthquake) {
      matchesEarthquake = row.Bina_analiz_deprem === filters.earthquake;
    }

    // Filter by direction (X or Y) by looking at combination
    if (filters.direction) {
      const combination = row.Bina_yuk_kombinasyon as string;
      
      if (filters.direction === 'X') {
        // Check if it's an X direction combination (contains Dx+ or Dx-)
        matchesDirection = combination.includes('Dx+') || combination.includes('Dx-');
      } else if (filters.direction === 'Y') {
        // Check if it's a Y direction combination (contains Dy+ or Dy-)
        matchesDirection = combination.includes('Dy+') || combination.includes('Dy-');
      }
    }

    // Return true if it matches all applied filters
    return matchesEarthquake && matchesDirection;
  });
}

/**
 * Extracts story performance status based on filtered results and selected performance criteria
 * @param filteredResults The filtered results data
 * @param performanceCriteria The selected performance criteria (SH, KH, GO)
 * @returns Array of story performance status objects
 */
export function getStoryPerformanceStatus(
  filteredResults: ResultRow[],
  performanceCriteria: 'SH' | 'KH' | 'GO' | null,
  direction: 'X' | 'Y' | null = null
): StoryPerformance[] {
  if (!filteredResults || filteredResults.length === 0 || !performanceCriteria) {
    return [];
  }

  // Extract unique stories from the results
  const storySet = new Set<string>();
  filteredResults.forEach((row) => {
    if (row.Bina_kat) {
      storySet.add(row.Bina_kat);
    }
  });

  const stories = Array.from(storySet);

  // For each story, check the performance status for the selected criteria
  return stories.map((story) => {
    // Get rows for this story
    const storyRows = filteredResults.filter((row) => row.Bina_kat === story);
    
    // Check if any row fails the performance criteria
    // Performance column name depends on the criteria (e.g., Bina_SH, Bina_KH, Bina_GO)
    const performanceColumnName = `Bina_${performanceCriteria}`;
    
    const failsPerformance = storyRows.some((row) => row[performanceColumnName] === 'Sağlamıyor');
    
    // Get the max and avg values for this story
    let maxDrift: number | undefined;
    let avgDrift: number | undefined;
    let maxNN0: number | undefined;
    let avgNN0: number | undefined;
    
    if (storyRows.length > 0) {
      // Initialize with first row values
      const firstRow = storyRows[0];
      
      if (direction === 'X') {
        maxDrift = firstRow.Bina_max_x_drift;
        avgDrift = firstRow.Bina_avg_x_drift;
      } else if (direction === 'Y') {
        maxDrift = firstRow.Bina_max_y_drift;
        avgDrift = firstRow.Bina_avg_y_drift;
      }
      
      maxNN0 = firstRow.Bina_max_n_n0;
      avgNN0 = firstRow.Bina_avg_n_n0;
      
      // Find max/avg values across all rows for this story
      storyRows.forEach((row) => {
        if (direction === 'X') {
          if (row.Bina_max_x_drift !== undefined && (maxDrift === undefined || row.Bina_max_x_drift > maxDrift)) {
            maxDrift = row.Bina_max_x_drift;
          }
          if (row.Bina_avg_x_drift !== undefined && (avgDrift === undefined || row.Bina_avg_x_drift > avgDrift)) {
            avgDrift = row.Bina_avg_x_drift;
          }
        } else if (direction === 'Y') {
          if (row.Bina_max_y_drift !== undefined && (maxDrift === undefined || row.Bina_max_y_drift > maxDrift)) {
            maxDrift = row.Bina_max_y_drift;
          }
          if (row.Bina_avg_y_drift !== undefined && (avgDrift === undefined || row.Bina_avg_y_drift > avgDrift)) {
            avgDrift = row.Bina_avg_y_drift;
          }
        }
        
        if (row.Bina_max_n_n0 !== undefined && (maxNN0 === undefined || row.Bina_max_n_n0 > maxNN0)) {
          maxNN0 = row.Bina_max_n_n0;
        }
        if (row.Bina_avg_n_n0 !== undefined && (avgNN0 === undefined || row.Bina_avg_n_n0 > avgNN0)) {
          avgNN0 = row.Bina_avg_n_n0;
        }
      });
    }
    
    return {
      story,
      performanceStatus: failsPerformance ? 'Sağlamıyor' : 'Sağlıyor',
      isCurrentVersion: false, // This will be set by the consumer based on the current version
      maxDrift,
      avgDrift,
      maxNN0,
      avgNN0
    };
  });
}

/**
 * Extract color coding information for stories based on performance status
 * @param storyPerformance Array of story performance statuses
 * @returns Object mapping story names to colors for visualization
 */
export function getStoryColors(storyPerformance: StoryPerformance[]): Record<string, string> {
  const colorMap: Record<string, string> = {};
  
  storyPerformance.forEach((story) => {
    // Set color based on performance status
    colorMap[story.story] = story.performanceStatus === 'Sağlıyor' 
      ? '#4ade80' // Green for passing
      : '#ef4444'; // Red for failing
  });
  
  return colorMap;
}

/**
 * Validate if the current filter selection is complete
 * @param filters Current filter criteria
 * @returns True if all required filters are selected
 */
export function isFilterSelectionComplete(filters: FilterCriteria): boolean {
  return filters.earthquake !== null && 
         filters.performance !== null && 
         filters.direction !== null;
}