import { useWeightUnit } from "../context/UserContext"
import { fromKg } from "../utils/units"

// A load the server keeps in kg (form checks), shown in the unit the person chose: "20 kg" or "44 lbs"; "—" when there is none
export default function LoadText({ kg }) {
  const unit = useWeightUnit()
  const shown = fromKg(kg, unit)
  return <>{shown == null ? "—" : `${shown} ${unit}`}</>
}
