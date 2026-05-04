import React, { useState, useEffect } from 'react';

const reviews = [
  {
    author: "James Miller",
    location: "Miller & Sons Plumbing, NY",
    action: "Sent SMS Campaign",
    message: "Hi James, thanks for choosing us! We'd love your feedback: [Review Link]",
    result: "⭐ Customer left a 5-star Google review",
  },
  {
    author: "Elena Rodriguez",
    location: "Cafe Bistro, Madrid",
    action: "Sent Email Campaign",
    message: "Hi Elena, thanks for visiting! How was your experience?",
    result: "⭐ Positive response → Converted into public review",
  },
  {
    author: "Sarah Jenkins",
    location: "Bright Smile Dental, London",
    action: "Sent Follow-up Message",
    message: "Hi Sarah, just checking in! We'd really appreciate your feedback.",
    result: "⭐ Follow-up increased response rate",
  },
  {
    author: "David Clark",
    location: "Auto Detailing Pro, LA",
    action: "SMS + Email Campaign",
    message: "Hi David, thanks for your visit! Share your experience here: [Review Link]",
    result: "⭐ 3 new reviews generated in 24 hours",
  },
  {
    author: "Liam Carter",
    location: "Urban Barbers, London",
    action: "Quick Campaign Launch",
    message: "Hi Liam, how was your experience with us?",
    result: "⭐ Increased customer engagement instantly",
  }
];

const ReviewCard = ({ item }) => (
  <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6 h-full">
    
    {/* Result Badge */}
    <div className="flex items-center gap-2 mb-3">
      <span className="text-green-600 text-xs font-semibold bg-green-100 px-2 py-1 rounded-full">
        {item.action}
      </span>
    </div>

    {/* Message */}
    <p className="text-sm italic text-slate-600 mb-4">"{item.message}"</p>

    {/* User Info */}
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
        {item.author[0]}
      </div>
      <div className="text-xs">
        <p className="font-bold text-slate-800">{item.author}</p>
        <p className="text-slate-500">{item.location}</p>
      </div>
    </div>

    {/* Result Box */}
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg relative">
      <div className="absolute -top-3 left-2 bg-blue-600 text-[10px] text-white px-2 py-0.5 rounded-full font-bold">
        RESULT
      </div>
      <p className="text-xs leading-relaxed text-slate-700 font-medium">
        {item.result}
      </p>
    </div>
  </div>
);

const ReviewMarquee = () => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % reviews.length);
        setAnimating(false);
      }, 500);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 mb-10">
        <h3 className="text-2xl font-bold text-center text-slate-800">
          Turn Customer Messages Into Real Reviews
        </h3>
      </div>

      {/* Desktop */}
      <div className="hidden md:grid md:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
        {reviews.map((item, idx) => (
          <ReviewCard key={idx} item={item} />
        ))}
      </div>

      {/* Mobile */}
      <div className="md:hidden px-4 overflow-hidden">
        <div
          className="transition-all duration-500 ease-in-out"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateX(60px)' : 'translateX(0)'
          }}
        >
          <ReviewCard item={reviews[current]} />
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-5">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current ? 'bg-blue-600 w-4' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewMarquee;