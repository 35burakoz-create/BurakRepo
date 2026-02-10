using UnityEngine;

namespace ThermoDrift
{
    /// <summary>
    /// Handles horizontal drag input and temperature-dependent traction/drift.
    /// </summary>
    [RequireComponent(typeof(Collider2D))]
    public class PlayerController : MonoBehaviour
    {
        [Header("Bounds")]
        [SerializeField] private float minX = -2.4f;
        [SerializeField] private float maxX = 2.4f;

        [Header("Control Feel")]
        [SerializeField, Min(0.5f)] private float maxControlSpeed = 11f;
        [SerializeField, Min(0.5f)] private float minControlSpeed = 3f;
        [SerializeField, Min(1f)] private float maxTraction = 16f;
        [SerializeField, Min(0.2f)] private float minTraction = 2f;

        [Header("References")]
        [SerializeField] private TemperatureField temperatureField;

        private float desiredX;
        private float lateralVelocity;
        private float pointerWorldOffset;
        private bool dragging;

        private Camera mainCam;

        private void Start()
        {
            mainCam = Camera.main;
            desiredX = transform.position.x;

            if (temperatureField == null)
            {
                temperatureField = FindObjectOfType<TemperatureField>();
            }
        }

        private void Update()
        {
            GameManager gm = GameManager.Instance;
            if (gm == null || gm.State != GameState.Running)
            {
                return;
            }

            HandlePointer();
            ApplyDriftAndTraction(gm);
        }

        private void HandlePointer()
        {
            if (mainCam == null)
            {
                return;
            }

            bool down = Input.GetMouseButtonDown(0);
            bool held = Input.GetMouseButton(0);
            bool up = Input.GetMouseButtonUp(0);

            if (Input.touchCount > 0)
            {
                Touch t = Input.GetTouch(0);
                down = t.phase == TouchPhase.Began;
                held = t.phase == TouchPhase.Moved || t.phase == TouchPhase.Stationary;
                up = t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled;
            }

            if (down)
            {
                float worldX = ScreenToWorldX(GetPointerScreenPos());
                pointerWorldOffset = transform.position.x - worldX;
                dragging = true;
            }

            if (held && dragging)
            {
                float worldX = ScreenToWorldX(GetPointerScreenPos());
                desiredX = Mathf.Clamp(worldX + pointerWorldOffset, minX, maxX);
            }

            if (up)
            {
                dragging = false;
            }
        }

        private void ApplyDriftAndTraction(GameManager gm)
        {
            float x = transform.position.x;
            float sampled = temperatureField != null ? temperatureField.SampleTemp(x, Time.time) : 0f;
            float distance = Mathf.Abs(sampled - gm.TargetTemp);
            gm.SetAlignment(distance);

            float badness01 = gm.TargetTolerance <= 0.001f ? 1f : Mathf.Clamp01(distance / gm.TargetTolerance);
            float traction = Mathf.Lerp(maxTraction, minTraction, badness01);
            float controlSpeed = Mathf.Lerp(maxControlSpeed, minControlSpeed, badness01);

            float targetVel = (desiredX - x) * controlSpeed;
            lateralVelocity = Mathf.MoveTowards(lateralVelocity, targetVel, traction * Time.deltaTime * 20f);

            Vector3 pos = transform.position;
            pos.x = Mathf.Clamp(pos.x + (lateralVelocity * Time.deltaTime), minX, maxX);
            transform.position = pos;
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            GameManager gm = GameManager.Instance;
            if (gm == null || gm.State != GameState.Running)
            {
                return;
            }

            if (other.CompareTag("Obstacle"))
            {
                gm.GameOver();
            }
            else if (other.CompareTag("Bonus"))
            {
                gm.AddScore(50f * gm.Multiplier);
                other.gameObject.SetActive(false);
            }
        }

        private float ScreenToWorldX(Vector2 screenPos)
        {
            Vector3 wp = mainCam.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, Mathf.Abs(mainCam.transform.position.z - transform.position.z)));
            return wp.x;
        }

        private static Vector2 GetPointerScreenPos()
        {
            if (Input.touchCount > 0)
            {
                return Input.GetTouch(0).position;
            }

            return Input.mousePosition;
        }
    }
}
