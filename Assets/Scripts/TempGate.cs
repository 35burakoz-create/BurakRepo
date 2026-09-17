using UnityEngine;

namespace ThermoDrift
{
    /// <summary>
    /// Trigger that immediately changes target temperature.
    /// </summary>
    [RequireComponent(typeof(Collider2D))]
    public class TempGate : MonoBehaviour
    {
        [SerializeField, Range(-1f, 1f)] private float targetOnEnter = 1f;

        public void Configure(float newTarget)
        {
            targetOnEnter = Mathf.Clamp(newTarget, -1f, 1f);
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (!other.CompareTag("Player"))
            {
                return;
            }

            GameManager gm = GameManager.Instance;
            if (gm == null || gm.State != GameState.Running)
            {
                return;
            }

            gm.SetTargetTemp(targetOnEnter, true);
            gameObject.SetActive(false);
        }
    }
}
