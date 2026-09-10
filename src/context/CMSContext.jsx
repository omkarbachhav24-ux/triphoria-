import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const CMSContext = createContext();

export const CMSProvider = ({ children }) => {
  const auth = useAuth();
  const user = auth ? auth.user : null;
  const [portfolio, setPortfolio] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [social, setSocial] = useState([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = user && user.role === 'admin';

  const refreshCMS = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Portfolio
      const portfolioUrl = isAdmin ? '/api/cms/admin/portfolio' : '/api/cms/portfolio';
      const pRes = await fetch(portfolioUrl, { credentials: 'include' });
      if (pRes.ok) {
        const pData = await pRes.json();
        setPortfolio(pData.portfolio || []);
      }

      // 2. Featured Slots
      const fRes = await fetch('/api/cms/featured');
      if (fRes.ok) {
        const fData = await fRes.json();
        setFeatured(fData.featured || []);
      }

      // 3. Social Items
      const socialUrl = isAdmin ? '/api/cms/admin/social' : '/api/cms/social';
      const sRes = await fetch(socialUrl, { credentials: 'include' });
      if (sRes.ok) {
        const sData = await sRes.json();
        setSocial(sData.social || []);
      }
    } catch (err) {
      console.warn('[CMS] Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    refreshCMS();
  }, [refreshCMS]);

  // Set Featured Slots (1, 2, 3)
  const setFeaturedSlots = async ({ slot1Id, slot2Id, slot3Id }) => {
    try {
      const res = await fetch('/api/cms/featured-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slot1Id, slot2Id, slot3Id })
      });

      if (res.ok) {
        await refreshCMS();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Add Portfolio Project
  const addPortfolioProject = async (projectData) => {
    try {
      const res = await fetch('/api/cms/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(projectData)
      });
      if (res.ok) {
        await refreshCMS();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Update Portfolio Project
  const updatePortfolioProject = async (id, projectData) => {
    try {
      const res = await fetch(`/api/cms/portfolio/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(projectData)
      });
      if (res.ok) {
        await refreshCMS();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Delete Portfolio Project
  const deletePortfolioProject = async (id) => {
    try {
      const res = await fetch(`/api/cms/portfolio/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        await refreshCMS();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Toggle Project Publish State
  const toggleProjectPublish = async (id) => {
    const target = portfolio.find(p => p.id === id);
    if (!target) return;
    return await updatePortfolioProject(id, { isPublished: !target.isPublished });
  };

  // Add Social Post
  const addSocialPost = async (postData) => {
    try {
      const res = await fetch('/api/cms/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(postData)
      });
      if (res.ok) {
        await refreshCMS();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Delete Social Post
  const deleteSocialPost = async (id) => {
    try {
      const res = await fetch(`/api/cms/social/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        await refreshCMS();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Toggle Social Post Publish State
  const toggleSocialPublish = async (id) => {
    const target = social.find(s => s.id === id);
    if (!target) return;
    // In database cms_social, we can re-post or update
    await deleteSocialPost(id);
    await addSocialPost({ ...target, isPublished: !target.isPublished });
  };

  return (
    <CMSContext.Provider
      value={{
        portfolio,
        featured,
        social,
        loading,
        setFeaturedSlots,
        addPortfolioProject,
        updatePortfolioProject,
        deletePortfolioProject,
        toggleProjectPublish,
        addSocialPost,
        deleteSocialPost,
        toggleSocialPublish,
        refreshCMS
      }}
    >
      {children}
    </CMSContext.Provider>
  );
};

export const useCMS = () => useContext(CMSContext);
