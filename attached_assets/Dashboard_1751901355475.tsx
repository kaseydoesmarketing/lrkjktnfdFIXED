import React, { useEffect, useState } from "react";
import { getActiveTests, cancelTest, generateTitle } from "../services/test-analytics-api";
import Loader from "./Loader";

const Dashboard = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await getActiveTests();
      setTests(res);
    } catch (err) {
      setError("Failed to load tests.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (testId: string) => {
    await cancelTest(testId);
    fetchTests();
  };

  const handleGenerateTitle = async (testId: string) => {
    await generateTitle(testId);
    fetchTests();
  };

  if (loading) return <Loader />;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid gap-4">
        {tests.map((test: any) => (
          <div key={test.id} className="bg-white shadow rounded p-4 flex flex-col">
            <div className="font-semibold text-lg mb-2">{test.currentTitle}</div>
            <div>
              {test.titleVariants?.map((variant: any, idx: number) => (
                <div key={idx} className="text-gray-700">
                  {variant.title} — {variant.views} views
                </div>
              ))}
            </div>
            <div className="mt-2">
              <button
                onClick={() => handleCancel(test.id)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGenerateTitle(test.id)}
                className="bg-blue-500 text-white px-2 py-1 rounded ml-2"
              >
                Generate AI Title
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;