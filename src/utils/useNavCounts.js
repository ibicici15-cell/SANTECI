import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchTravelerFavoritesCount, fetchTravelerRequestsCount, fetchTravelerCasierDocCount,
  fetchAgencyNewRequestsCount,
} from './db'
import { subscribeCounts } from './countsBus'

// Compteurs affichés dans la navbar (web) et la barre d'onglets (app).
export default function useNavCounts() {
  const { agency, traveler } = useAuth()
  const [favCount, setFavCount] = useState(0)
  const [reqCount, setReqCount] = useState(0)
  const [docCount, setDocCount] = useState(0)
  const [agencyNewCount, setAgencyNewCount] = useState(0)

  function refreshCounts() {
    if (traveler) {
      fetchTravelerFavoritesCount(traveler.id).then(setFavCount)
      fetchTravelerRequestsCount(traveler.id).then(setReqCount)
      fetchTravelerCasierDocCount(traveler.id).then(setDocCount)
    }
    if (agency) {
      fetchAgencyNewRequestsCount(agency.id).then(setAgencyNewCount)
    }
  }

  useEffect(() => { refreshCounts() }, [traveler?.id, agency?.id])
  // Se rafraîchit dès qu'une action ailleurs dans l'app modifie un favori,
  // une demande ou un document.
  useEffect(() => subscribeCounts(refreshCounts), [traveler?.id, agency?.id])

  return { favCount, reqCount, docCount, agencyNewCount }
}
