import { useNavigate } from 'react-router-dom'
import { useFilters } from '../contexts/FiltersContext'

export const useNavigationService = () => {
  const navigate = useNavigate()
  const { setSelectedAreaId, areaInfo } = useFilters()

  const navigateToArea = (areaId, source) => {
    const currentPath = window.location.pathname;
    const targetPath = areaId ? `/map/climbing/${areaId}` : '/map/climbing';

    // Only navigate if the path is different
    if (currentPath !== targetPath) {
      navigate(targetPath);
    }

    // Only update state if different
    setSelectedAreaId(prev => (prev !== areaId ? areaId : prev));
  }

  const navigateHome = () => {
    console.log('Navigating home')
    navigate('/')
    setSelectedAreaId(null)
  }

  return {
    navigateToArea,
    navigateHome
  }
} 