using UnityEngine;

namespace ThermoDrift
{
    /// <summary>
    /// Samples a procedural scalar temperature field from -1..+1.
    /// </summary>
    public class TemperatureField : MonoBehaviour
    {
        [Header("Field Noise")]
        [SerializeField] private float spatialFrequency = 0.35f;
        [SerializeField] private float timeFrequency = 0.7f;
        [SerializeField] private float harmonics = 0.55f;
        [SerializeField] private float harmonicScale = 2.2f;

        public float SampleTemp(float x, float timeSeconds)
        {
            float w1 = Mathf.Sin((x * spatialFrequency) + (timeSeconds * timeFrequency));
            float w2 = Mathf.Cos(((x * spatialFrequency) * harmonicScale) - (timeSeconds * timeFrequency * 1.6f));
            return Mathf.Clamp((w1 + (w2 * harmonics)) / (1f + harmonics), -1f, 1f);
        }

        public bool IdealMask(float x, float timeSeconds, float targetTemp, float tolerance)
        {
            if (tolerance <= 0f)
            {
                return false;
            }

            float sampled = SampleTemp(x, timeSeconds);
            return Mathf.Abs(sampled - targetTemp) <= tolerance;
        }

        public float FindNearestIdealX(float fromX, float minX, float maxX, float timeSeconds, float targetTemp, float tolerance, int scanSteps = 32)
        {
            float bestX = Mathf.Clamp(fromX, minX, maxX);
            float bestCost = float.MaxValue;

            for (int i = 0; i <= scanSteps; i++)
            {
                float t = i / (float)scanSteps;
                float x = Mathf.Lerp(minX, maxX, t);
                float tempDiff = Mathf.Abs(SampleTemp(x, timeSeconds) - targetTemp);
                float moveCost = Mathf.Abs(x - fromX) * 0.15f;
                float cost = tempDiff + moveCost;

                if (cost < bestCost)
                {
                    bestCost = cost;
                    bestX = x;
                }
            }

            return bestX;
        }
    }
}
